/**
 * Asset Takeback Service
 * Gestion des reprises programmées
 * 
 * RÈGLES :
 * - Traçabilité COMPLÈTE de chaque étape
 * - Confirmation data wipe obligatoire
 * - Intégration WMS
 */

import { PrismaClient } from '@prisma/client';
import {
    TakebackOrderEntity,
    TakebackOrderView,
    CreateTakebackDto,
    UpdateTakebackDto,
    TakebackStatus,
    TAKEBACK_STATUS_LABELS,
    TakebackNotFoundError,
    TakebackInvalidTransitionError
} from '../domain/assetLifecycle.types';

export class AssetTakebackService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Créer un ordre de reprise
     * Déclenché après exécution d'un renouvellement
     */
    async createTakeback(dto: CreateTakebackDto): Promise<TakebackOrderEntity> {
        const takeback = await this.prisma.$transaction(async (tx) => {
            // 1. Créer l'ordre de reprise
            const order = await tx.takebackOrder.create({
                data: {
                    renewalId: dto.renewalId,
                    assetId: dto.assetId,
                    serialNumber: dto.serialNumber || null,
                    status: 'INITIATED',
                    trackingNumber: dto.trackingNumber || null,
                    notes: dto.notes || null
                }
            });

            // 2. Récupérer le contrat pour le companyId
            const renewal = await tx.renewalPlan.findUnique({
                where: { id: dto.renewalId },
                include: { contract: true }
            });

            // 3. Logger l'événement
            await tx.subscriptionEvent.create({
                data: {
                    eventType: 'AssetTakebackInitiated',
                    entityType: 'TakebackOrder',
                    entityId: order.id,
                    companyId: renewal?.contract.companyId || 'unknown',
                    data: JSON.stringify({ assetId: dto.assetId })
                }
            });

            return order;
        });

        console.log(`[TAKEBACK] Initiated takeback ${takeback.id} for asset ${dto.assetId}`);

        return this.toEntity(takeback);
    }

    /**
     * Créer des ordres de reprise pour tous les assets d'un renouvellement
     */
    async createTakebacksForRenewal(renewalId: string): Promise<TakebackOrderEntity[]> {
        const renewal = await this.prisma.renewalPlan.findUnique({
            where: { id: renewalId },
            include: { contract: { include: { assets: true } } }
        });

        if (!renewal) {
            throw new TakebackNotFoundError(renewalId);
        }

        const takebacks: TakebackOrderEntity[] = [];

        for (const asset of renewal.contract.assets) {
            const takeback = await this.createTakeback({
                renewalId,
                assetId: asset.assetId,
                serialNumber: asset.serialNumber || undefined
            });
            takebacks.push(takeback);
        }

        console.log(`[TAKEBACK] Created ${takebacks.length} takeback orders for renewal ${renewalId}`);

        return takebacks;
    }

    /**
     * Récupérer un ordre de reprise
     */
    async getTakeback(takebackId: string): Promise<TakebackOrderView> {
        const takeback = await this.prisma.takebackOrder.findUnique({
            where: { id: takebackId }
        });

        if (!takeback) {
            throw new TakebackNotFoundError(takebackId);
        }

        return {
            id: takeback.id,
            assetId: takeback.assetId,
            serialNumber: takeback.serialNumber,
            status: takeback.status as TakebackStatus,
            statusLabel: TAKEBACK_STATUS_LABELS[takeback.status as TakebackStatus],
            dataWipeConfirmed: takeback.dataWipeConfirmed,
            trackingNumber: takeback.trackingNumber,
            createdAt: takeback.createdAt.toISOString()
        };
    }

    /**
     * Récupérer les reprises d'un renouvellement
     */
    async getTakebacksByRenewal(renewalId: string): Promise<TakebackOrderView[]> {
        const takebacks = await this.prisma.takebackOrder.findMany({
            where: { renewalId },
            orderBy: { createdAt: 'desc' }
        });

        return takebacks.map(t => ({
            id: t.id,
            assetId: t.assetId,
            serialNumber: t.serialNumber,
            status: t.status as TakebackStatus,
            statusLabel: TAKEBACK_STATUS_LABELS[t.status as TakebackStatus],
            dataWipeConfirmed: t.dataWipeConfirmed,
            trackingNumber: t.trackingNumber,
            createdAt: t.createdAt.toISOString()
        }));
    }

    /**
     * Mettre à jour le statut d'une reprise
     * TRAÇABILITÉ : Chaque transition est loggée
     */
    async updateTakebackStatus(takebackId: string, dto: UpdateTakebackDto): Promise<TakebackOrderView> {
        const current = await this.prisma.takebackOrder.findUnique({
            where: { id: takebackId },
            include: { renewal: { include: { contract: true } } }
        });

        if (!current) {
            throw new TakebackNotFoundError(takebackId);
        }

        // Valider la transition si nouveau statut
        if (dto.status) {
            this.validateTransition(current.status as TakebackStatus, dto.status);
        }

        const updateData: Record<string, unknown> = {};

        if (dto.status) updateData.status = dto.status;
        if (dto.collectedAt) updateData.collectedAt = new Date(dto.collectedAt);
        if (dto.dataWipeConfirmed !== undefined) {
            updateData.dataWipeConfirmed = dto.dataWipeConfirmed;
            if (dto.dataWipeConfirmed) updateData.dataWipedAt = new Date();
        }
        if (dto.receivedWmsAt) updateData.receivedWmsAt = new Date(dto.receivedWmsAt);
        if (dto.trackingNumber) updateData.trackingNumber = dto.trackingNumber;
        if (dto.notes) updateData.notes = dto.notes;

        // Si statut COMPLETED
        if (dto.status === 'COMPLETED') {
            updateData.completedAt = new Date();
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.takebackOrder.update({
                where: { id: takebackId },
                data: updateData
            });

            // Logger l'événement
            const eventType = dto.status === 'COMPLETED'
                ? 'AssetTakebackCompleted'
                : 'AssetTakebackUpdated';

            await tx.subscriptionEvent.create({
                data: {
                    eventType,
                    entityType: 'TakebackOrder',
                    entityId: takebackId,
                    companyId: current.renewal.contract.companyId,
                    data: JSON.stringify({ newStatus: dto.status, ...dto })
                }
            });
        });

        console.log(`[TAKEBACK] Updated takeback ${takebackId} to status ${dto.status || 'unchanged'}`);

        return this.getTakeback(takebackId);
    }

    /**
     * Confirmer l'effacement des données
     */
    async confirmDataWipe(takebackId: string): Promise<void> {
        await this.updateTakebackStatus(takebackId, {
            status: 'DATA_WIPED',
            dataWipeConfirmed: true
        });

        console.log(`[TAKEBACK] Data wipe confirmed for takeback ${takebackId}`);
    }

    // ============================================
    // HELPERS
    // ============================================

    private validateTransition(from: TakebackStatus, to: TakebackStatus): void {
        const validTransitions: Record<TakebackStatus, TakebackStatus[]> = {
            INITIATED: ['COLLECTED'],
            COLLECTED: ['DATA_WIPED'],
            DATA_WIPED: ['RECEIVED_WMS'],
            RECEIVED_WMS: ['COMPLETED'],
            COMPLETED: []
        };

        if (!validTransitions[from].includes(to)) {
            throw new TakebackInvalidTransitionError(from, to);
        }
    }

    private toEntity(takeback: any): TakebackOrderEntity {
        return {
            id: takeback.id,
            renewalId: takeback.renewalId,
            assetId: takeback.assetId,
            serialNumber: takeback.serialNumber,
            status: takeback.status,
            collectedAt: takeback.collectedAt,
            dataWipeConfirmed: takeback.dataWipeConfirmed,
            dataWipedAt: takeback.dataWipedAt,
            receivedWmsAt: takeback.receivedWmsAt,
            completedAt: takeback.completedAt,
            trackingNumber: takeback.trackingNumber,
            notes: takeback.notes,
            createdAt: takeback.createdAt,
            updatedAt: takeback.updatedAt
        };
    }
}
