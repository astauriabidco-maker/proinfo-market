/**
 * SAV Service
 * Logique métier pour la gestion des tickets SAV et RMA
 * 
 * RÈGLE : Le SAV est opposable juridiquement. Historique préservé.
 */

import { PrismaClient, TicketStatus, RmaStatus, ResolutionType } from '@prisma/client';
import { TicketRepository } from '../repositories/ticket.repository';
import { RmaRepository } from '../repositories/rma.repository';
import { DiagnosisRepository } from '../repositories/diagnosis.repository';
import {
    AssetServiceClient,
    HttpAssetServiceClient
} from '../integrations/asset.client';
import {
    InventoryServiceClient,
    HttpInventoryServiceClient
} from '../integrations/inventory.client';
import {
    QualityServiceClient,
    HttpQualityServiceClient
} from '../integrations/quality.client';
import {
    CreateTicketDto,
    TicketEntity,
    AssetNotSoldError,
    TicketNotFoundError
} from '../domain/ticket.types';
import { RmaEntity, RmaNotFoundError, InvalidRmaStatusError } from '../domain/rma.types';
import { CreateDiagnosisDto, DiagnosisEntity, RmaNotReceivedError, RmaNotDiagnosedError } from '../domain/diagnosis.types';
import {
    emitSavTicketCreated,
    emitRmaCreated,
    emitRmaReceived,
    emitRmaDiagnosed,
    emitRmaResolved
} from '../events/sav.events';

export class SavService {
    private readonly ticketRepository: TicketRepository;
    private readonly rmaRepository: RmaRepository;
    private readonly diagnosisRepository: DiagnosisRepository;
    private readonly assetClient: AssetServiceClient;
    private readonly inventoryClient: InventoryServiceClient;
    private readonly qualityClient: QualityServiceClient;

    constructor(
        prisma: PrismaClient,
        assetClient?: AssetServiceClient,
        inventoryClient?: InventoryServiceClient,
        qualityClient?: QualityServiceClient
    ) {
        this.ticketRepository = new TicketRepository(prisma);
        this.rmaRepository = new RmaRepository(prisma);
        this.diagnosisRepository = new DiagnosisRepository(prisma);
        this.assetClient = assetClient ?? new HttpAssetServiceClient();
        this.inventoryClient = inventoryClient ?? new HttpInventoryServiceClient();
        this.qualityClient = qualityClient ?? new HttpQualityServiceClient();
    }

    // ============================================
    // TICKET OPERATIONS
    // ============================================

    /**
     * Crée un ticket SAV
     * Règle : Asset doit être SOLD
     */
    async createTicket(dto: CreateTicketDto): Promise<TicketEntity> {
        // Vérifier que l'Asset est SOLD
        const asset = await this.assetClient.getAsset(dto.assetId);
        if (asset.status !== 'SOLD') {
            throw new AssetNotSoldError(dto.assetId, asset.status);
        }

        // Créer le ticket en OPEN
        const ticket = await this.ticketRepository.create(
            dto.assetId,
            dto.customerRef,
            dto.issue
        );

        emitSavTicketCreated(ticket);
        return ticket;
    }

    /**
     * Récupère un ticket par ID
     */
    async getTicket(ticketId: string): Promise<TicketEntity> {
        const ticket = await this.ticketRepository.findById(ticketId);
        if (!ticket) {
            throw new TicketNotFoundError(ticketId);
        }
        return ticket;
    }

    /**
     * Récupère les tickets pour un Asset
     */
    async getTicketsByAsset(assetId: string): Promise<TicketEntity[]> {
        return this.ticketRepository.findByAssetId(assetId);
    }

    // ============================================
    // RMA OPERATIONS
    // ============================================

    /**
     * Crée un RMA pour un ticket
     * Étapes : Asset → RMA, RMA → CREATED
     */
    async createRma(ticketId: string): Promise<RmaEntity> {
        // Vérifier le ticket
        const ticket = await this.getTicket(ticketId);

        // Mettre l'Asset en RMA
        await this.assetClient.updateStatus(ticket.assetId, 'RMA');

        // Créer le RMA
        const rma = await this.rmaRepository.create(ticket.assetId, ticketId);

        // Mettre le ticket en IN_PROGRESS
        await this.ticketRepository.updateStatus(ticketId, TicketStatus.IN_PROGRESS);

        emitRmaCreated(rma);
        return rma;
    }

    /**
     * Réception d'un RMA
     * Étapes : Mouvement RETURN, RMA → RECEIVED
     */
    async receiveRma(rmaId: string): Promise<RmaEntity> {
        const rma = await this.getRma(rmaId);

        if (rma.status !== RmaStatus.CREATED) {
            throw new InvalidRmaStatusError(rmaId, rma.status, RmaStatus.CREATED);
        }

        // Mouvement Inventory RETURN
        await this.inventoryClient.moveAsset(rma.assetId, 'RETURN', 'SAV_ZONE');

        // Mettre RMA en RECEIVED
        const updatedRma = await this.rmaRepository.updateStatus(rmaId, RmaStatus.RECEIVED);

        emitRmaReceived(updatedRma);
        return updatedRma;
    }

    /**
     * Diagnostic d'un RMA
     * Règle : RMA doit être RECEIVED, diagnostic append-only
     */
    async diagnoseRma(rmaId: string, dto: CreateDiagnosisDto): Promise<DiagnosisEntity> {
        const rma = await this.getRma(rmaId);

        if (rma.status !== RmaStatus.RECEIVED) {
            throw new RmaNotReceivedError(rmaId);
        }

        // Créer le diagnostic (append-only)
        const diagnosis = await this.diagnosisRepository.create(
            rmaId,
            dto.diagnosis,
            dto.resolution
        );

        // Mettre RMA en DIAGNOSED
        const updatedRma = await this.rmaRepository.updateStatus(rmaId, RmaStatus.DIAGNOSED);

        emitRmaDiagnosed(updatedRma, diagnosis);
        return diagnosis;
    }

    /**
     * Résolution d'un RMA
     * Étapes selon resolution : REPAIR, REPLACE, REFUND, SCRAP
     */
    async resolveRma(rmaId: string): Promise<RmaEntity> {
        const rma = await this.getRma(rmaId);

        if (rma.status !== RmaStatus.DIAGNOSED) {
            throw new RmaNotDiagnosedError(rmaId);
        }

        // Récupérer le diagnostic
        const diagnosis = await this.diagnosisRepository.findLatestByRmaId(rmaId);
        if (!diagnosis) {
            throw new RmaNotDiagnosedError(rmaId);
        }

        // Appliquer la résolution
        switch (diagnosis.resolution) {
            case ResolutionType.REPAIR:
                // Relancer cycle qualité
                await this.qualityClient.initiateQualityCheck(rma.assetId, 'FULL');
                // Asset → QUALITY_PENDING
                await this.assetClient.updateStatus(rma.assetId, 'QUALITY_PENDING');
                break;

            case ResolutionType.SCRAP:
                // Asset → SCRAPPED
                await this.assetClient.updateStatus(rma.assetId, 'SCRAPPED');
                break;

            case ResolutionType.REPLACE:
            case ResolutionType.REFUND:
                // Hors scope MVP : marqué comme résolu seulement
                break;
        }

        // RMA → RESOLVED
        const updatedRma = await this.rmaRepository.updateStatus(rmaId, RmaStatus.RESOLVED);

        // Fermer le ticket
        const ticket = await this.ticketRepository.findById(rma.ticketId);
        if (ticket) {
            await this.ticketRepository.updateStatus(ticket.id, TicketStatus.CLOSED);
        }

        emitRmaResolved(updatedRma, diagnosis.resolution);
        return updatedRma;
    }

    /**
     * Récupère un RMA par ID
     */
    async getRma(rmaId: string): Promise<RmaEntity> {
        const rma = await this.rmaRepository.findById(rmaId);
        if (!rma) {
            throw new RmaNotFoundError(rmaId);
        }
        return rma;
    }

    /**
     * Récupère les RMA pour un Asset
     */
    async getRmasByAsset(assetId: string): Promise<RmaEntity[]> {
        return this.rmaRepository.findByAssetId(assetId);
    }

    /**
     * Récupère l'historique des diagnostics pour un RMA
     */
    async getDiagnosisHistory(rmaId: string): Promise<DiagnosisEntity[]> {
        return this.diagnosisRepository.findAllByRmaId(rmaId);
    }
}
