/**
 * Procurement Service
 * Logique métier pour la gestion des achats et intake
 */

import { PrismaClient } from '@prisma/client';
import { ProcurementLotRepository } from '../repositories/procurementLot.repository';
import { ProcurementItemRepository } from '../repositories/procurementItem.repository';
import { emitProcurementLotCreated, emitAssetIntaked } from '../events/procurement.events';
import {
    CreateProcurementLotDto,
    IntakeAssetDto,
    ProcurementLotEntity,
    ProcurementLotItemEntity,
    ProcurementLotNotFoundError,
    IntakeQuotaExceededError,
    AssetServiceError,
    AssetServiceResponse,
    ValidationError
} from '../domain/procurement.types';

/**
 * Interface pour le client Asset Service (injectable pour tests)
 */
export interface AssetServiceClient {
    createAsset(dto: {
        serialNumber: string;
        assetType: string;
        brand: string;
        model: string;
        chassisRef?: string;
    }): Promise<AssetServiceResponse>;
}

/**
 * Client HTTP par défaut pour Asset Service
 */
export class HttpAssetServiceClient implements AssetServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';
    }

    async createAsset(dto: {
        serialNumber: string;
        assetType: string;
        brand: string;
        model: string;
        chassisRef?: string;
    }): Promise<AssetServiceResponse> {
        const response = await fetch(`${this.baseUrl}/assets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new AssetServiceError(response.status, errorBody);
        }

        return response.json() as Promise<AssetServiceResponse>;
    }
}

export class ProcurementService {
    private readonly lotRepository: ProcurementLotRepository;
    private readonly itemRepository: ProcurementItemRepository;
    private readonly assetServiceClient: AssetServiceClient;

    constructor(prisma: PrismaClient, assetServiceClient?: AssetServiceClient) {
        this.lotRepository = new ProcurementLotRepository(prisma);
        this.itemRepository = new ProcurementItemRepository(prisma);
        this.assetServiceClient = assetServiceClient ?? new HttpAssetServiceClient();
    }

    /**
     * Crée un lot d'achat
     * 
     * Règles :
     * - totalUnitsDeclared > 0
     * - totalPurchasePrice > 0
     * - Le lot est créé sans Assets
     */
    async createLot(dto: CreateProcurementLotDto): Promise<ProcurementLotEntity> {
        // Validation
        if (dto.totalUnitsDeclared <= 0) {
            throw new ValidationError('totalUnitsDeclared must be greater than 0');
        }
        if (dto.totalPurchasePrice <= 0) {
            throw new ValidationError('totalPurchasePrice must be greater than 0');
        }

        // Créer le lot
        const lot = await this.lotRepository.create(dto);

        // Émettre l'événement
        emitProcurementLotCreated(lot);

        return lot;
    }

    /**
     * Intake d'une machine (création Asset + rattachement au lot)
     * 
     * Étapes STRICTES (dans cet ordre) :
     * 1. Vérifier que le lot existe
     * 2. Vérifier que items.count < totalUnitsDeclared
     * 3. Appeler Asset Service (POST /assets)
     * 4. Récupérer assetId
     * 5. Créer ProcurementLotItem
     * 6. Émettre événement AssetIntaked
     * 
     * Si l'Asset Service refuse → pas de création d'item
     */
    async intakeAsset(lotId: string, dto: IntakeAssetDto): Promise<ProcurementLotItemEntity> {
        // 1. Vérifier que le lot existe
        const lot = await this.lotRepository.findById(lotId);
        if (!lot) {
            throw new ProcurementLotNotFoundError(lotId);
        }

        // 2. Vérifier le quota
        const currentItemCount = await this.itemRepository.countByLotId(lotId);
        if (currentItemCount >= lot.totalUnitsDeclared) {
            throw new IntakeQuotaExceededError(lotId, lot.totalUnitsDeclared, currentItemCount);
        }

        // 3. Appeler Asset Service pour créer l'asset
        // Cette étape peut échouer - pas de rollback nécessaire car rien n'a été créé localement
        const assetResponse = await this.assetServiceClient.createAsset({
            serialNumber: dto.serialNumber,
            assetType: dto.assetType,
            brand: dto.brand,
            model: dto.model,
            chassisRef: dto.chassisRef
        });

        // 4. Récupérer l'assetId
        const assetId = assetResponse.id;

        // 5. Créer le ProcurementLotItem
        const item = await this.itemRepository.create(lotId, assetId, dto.unitCost);

        // 6. Émettre l'événement
        emitAssetIntaked(lot, item, dto.serialNumber, currentItemCount + 1);

        return item;
    }

    /**
     * Récupère un lot par ID
     */
    async getLot(lotId: string): Promise<ProcurementLotEntity> {
        const lot = await this.lotRepository.findById(lotId);
        if (!lot) {
            throw new ProcurementLotNotFoundError(lotId);
        }
        return lot;
    }

    /**
     * Liste tous les lots
     */
    async listLots(limit?: number, offset?: number): Promise<ProcurementLotEntity[]> {
        return this.lotRepository.findAll(limit, offset);
    }

    /**
     * Liste les items d'un lot
     */
    async getLotItems(lotId: string): Promise<ProcurementLotItemEntity[]> {
        const lot = await this.lotRepository.findById(lotId);
        if (!lot) {
            throw new ProcurementLotNotFoundError(lotId);
        }
        return this.itemRepository.findByLotId(lotId);
    }
}
