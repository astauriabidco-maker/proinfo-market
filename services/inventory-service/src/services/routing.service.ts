/**
 * Routing Service
 * Service de routage déterministe des commandes vers entrepôts
 * 
 * RÈGLES STRICTES :
 * - Une commande = un seul site
 * - Pas de réassignation après démarrage WMS
 * - Pas de split multi-sites
 */

import { PrismaClient, StockStatus } from '@prisma/client';
import {
    RoutingRequest,
    RoutingResult,
    WarehouseScore,
    ROUTING_PRIORITY,
    DELIVERY_DELAYS,
    emitWarehouseAssigned,
    emitAssetReservedAtWarehouse,
    emitRoutingFailed,
    NoWarehouseAvailableError,
    WmsAlreadyStartedError
} from '../domain/warehouse.types';

// ============================================
// INTERFACES
// ============================================

export interface WmsStatusProvider {
    hasWmsStarted(orderId: string): Promise<boolean>;
}

export interface OrderAssignmentStore {
    getAssignment(orderId: string): Promise<string | null>;
    setAssignment(orderId: string, warehouseId: string): Promise<void>;
}

// ============================================
// SERVICE
// ============================================

export class RoutingService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly wmsProvider: WmsStatusProvider,
        private readonly assignmentStore: OrderAssignmentStore
    ) { }

    // ============================================
    // MAIN ROUTING
    // ============================================

    /**
     * Assigne une commande à un seul entrepôt
     * 
     * RÈGLE STRICTE : Le système décide, l'humain exécute
     */
    async assignOrderToWarehouse(request: RoutingRequest): Promise<RoutingResult> {
        const { orderId, customerCountry, assetIds } = request;

        // 1. Vérifier si WMS déjà démarré
        const wmsStarted = await this.wmsProvider.hasWmsStarted(orderId);
        if (wmsStarted) {
            throw new WmsAlreadyStartedError(orderId);
        }

        // 2. Vérifier si déjà assigné
        const existingAssignment = await this.assignmentStore.getAssignment(orderId);
        if (existingAssignment) {
            // Retourner l'assignation existante
            const warehouse = await this.prisma.warehouse.findUnique({
                where: { id: existingAssignment }
            });
            return {
                orderId,
                assignedWarehouseId: existingAssignment,
                assignedWarehouseCode: warehouse?.code || 'UNKNOWN',
                estimatedDelay: this.getDeliveryDelay(warehouse?.country || 'DEFAULT', customerCountry),
                assetsReserved: assetIds,
                calculatedAt: new Date()
            };
        }

        // 3. Calculer les scores des entrepôts
        const scores = await this.calculateWarehouseScores(assetIds, customerCountry);

        // 4. Sélectionner le meilleur (UN SEUL)
        const bestWarehouse = this.selectBestWarehouse(scores, assetIds.length);

        if (!bestWarehouse) {
            emitRoutingFailed(orderId, 'No warehouse with sufficient available stock');
            throw new NoWarehouseAvailableError(orderId, 'No warehouse has all required assets available');
        }

        // 5. Réserver les assets
        await this.reserveAssets(assetIds, bestWarehouse.warehouseId, orderId);

        // 6. Enregistrer l'assignation
        await this.assignmentStore.setAssignment(orderId, bestWarehouse.warehouseId);

        // 7. Émettre événement
        emitWarehouseAssigned(orderId, bestWarehouse.warehouseCode);

        return {
            orderId,
            assignedWarehouseId: bestWarehouse.warehouseId,
            assignedWarehouseCode: bestWarehouse.warehouseCode,
            estimatedDelay: bestWarehouse.estimatedDelay,
            assetsReserved: assetIds,
            calculatedAt: new Date()
        };
    }

    // ============================================
    // SCORING
    // ============================================

    /**
     * Calcule un score pour chaque entrepôt basé sur les critères v1
     */
    async calculateWarehouseScores(assetIds: string[], customerCountry: string): Promise<WarehouseScore[]> {
        // Récupérer les entrepôts actifs
        const activeWarehouses = await this.prisma.warehouse.findMany({
            where: { active: true }
        });

        const scores: WarehouseScore[] = [];

        for (const warehouse of activeWarehouses) {
            // Compter les assets AVAILABLE dans cet entrepôt
            const availableCount = await this.prisma.stockLocation.count({
                where: {
                    warehouseId: warehouse.id,
                    assetId: { in: assetIds },
                    status: StockStatus.AVAILABLE
                }
            });

            const reasons: string[] = [];
            let score = 0;

            // Critère 1 : Même pays
            if (warehouse.country === customerCountry) {
                score += ROUTING_PRIORITY.SAME_COUNTRY;
                reasons.push(`Same country (+${ROUTING_PRIORITY.SAME_COUNTRY})`);
            }

            // Critère 2 : Stock complet
            if (availableCount === assetIds.length) {
                score += ROUTING_PRIORITY.FULL_STOCK;
                reasons.push(`Full stock (+${ROUTING_PRIORITY.FULL_STOCK})`);
            }

            // Critère 3 : Délai court
            const delay = this.getDeliveryDelay(warehouse.country, customerCountry);
            if (delay <= 2) {
                score += ROUTING_PRIORITY.SHORT_DELAY;
                reasons.push(`Short delay (+${ROUTING_PRIORITY.SHORT_DELAY})`);
            }

            scores.push({
                warehouseId: warehouse.id,
                warehouseCode: warehouse.code,
                country: warehouse.country,
                score,
                availableAssets: availableCount,
                estimatedDelay: delay,
                reasons
            });
        }

        // Trier par score décroissant
        return scores.sort((a, b) => b.score - a.score);
    }

    /**
     * Sélectionne l'entrepôt avec le meilleur score ET stock complet
     * 
     * RÈGLE : Pas de split commande → stock complet requis
     */
    private selectBestWarehouse(scores: WarehouseScore[], requiredAssets: number): WarehouseScore | null {
        // Filtrer ceux qui ont le stock complet
        const withFullStock = scores.filter(s => s.availableAssets === requiredAssets);

        if (withFullStock.length === 0) {
            return null;
        }

        // Retourner le premier (meilleur score)
        return withFullStock[0] ?? null;
    }

    // ============================================
    // RESERVATION
    // ============================================

    /**
     * Réserve les assets pour une commande
     */
    private async reserveAssets(assetIds: string[], warehouseId: string, orderId: string): Promise<void> {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id: warehouseId }
        });

        for (const assetId of assetIds) {
            await this.prisma.stockLocation.updateMany({
                where: {
                    assetId,
                    warehouseId,
                    status: StockStatus.AVAILABLE
                },
                data: {
                    status: StockStatus.RESERVED,
                    orderId
                }
            });

            emitAssetReservedAtWarehouse(assetId, warehouse?.code || warehouseId, orderId);
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    private getDeliveryDelay(warehouseCountry: string, customerCountry: string): number {
        const defaultDelay = DELIVERY_DELAYS.DEFAULT ?? 5;
        if (warehouseCountry === customerCountry) {
            return DELIVERY_DELAYS[customerCountry] ?? defaultDelay;
        }
        // Cross-border = délai max des deux pays + 1
        const whDelay = DELIVERY_DELAYS[warehouseCountry] ?? defaultDelay;
        const custDelay = DELIVERY_DELAYS[customerCountry] ?? defaultDelay;
        return Math.max(whDelay, custDelay) + 1;
    }

    // ============================================
    // WAREHOUSE MANAGEMENT
    // ============================================

    async createWarehouse(data: { code: string; name: string; country: string }): Promise<{ id: string }> {
        const warehouse = await this.prisma.warehouse.create({
            data: {
                code: data.code,
                name: data.name,
                country: data.country,
                active: true
            }
        });
        return { id: warehouse.id };
    }

    async getActiveWarehouses(): Promise<any[]> {
        return this.prisma.warehouse.findMany({
            where: { active: true },
            orderBy: { code: 'asc' }
        });
    }

    async getStockLocation(assetId: string): Promise<any | null> {
        return this.prisma.stockLocation.findUnique({
            where: { assetId },
            include: { warehouse: true }
        });
    }
}
