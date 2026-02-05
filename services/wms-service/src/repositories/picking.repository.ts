/**
 * Picking Repository
 * Couche d'accès aux données pour les ordres de picking
 */

import { PrismaClient, PickingOrder, PickingStatus } from '@prisma/client';
import { PickingOrderEntity } from '../domain/picking.types';

export class PickingRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un ordre de picking
     */
    async create(assetId: string): Promise<PickingOrderEntity> {
        const order = await this.prisma.pickingOrder.create({
            data: {
                assetId,
                status: PickingStatus.PENDING
            }
        });
        return this.toEntity(order);
    }

    /**
     * Recherche un ordre par ID
     */
    async findById(id: string): Promise<PickingOrderEntity | null> {
        const order = await this.prisma.pickingOrder.findUnique({
            where: { id }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Recherche un ordre actif par assetId
     */
    async findActiveByAssetId(assetId: string): Promise<PickingOrderEntity | null> {
        const order = await this.prisma.pickingOrder.findFirst({
            where: {
                assetId,
                status: { in: [PickingStatus.PENDING, PickingStatus.IN_PROGRESS] }
            }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Recherche le dernier ordre complété par assetId
     */
    async findCompletedByAssetId(assetId: string): Promise<PickingOrderEntity | null> {
        const order = await this.prisma.pickingOrder.findFirst({
            where: {
                assetId,
                status: PickingStatus.COMPLETED
            },
            orderBy: { createdAt: 'desc' }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Met à jour le statut
     */
    async updateStatus(id: string, status: PickingStatus): Promise<PickingOrderEntity> {
        const order = await this.prisma.pickingOrder.update({
            where: { id },
            data: { status }
        });
        return this.toEntity(order);
    }

    /**
     * Convertit en entité
     */
    private toEntity(order: PickingOrder): PickingOrderEntity {
        return {
            id: order.id,
            assetId: order.assetId,
            status: order.status,
            createdAt: order.createdAt
        };
    }
}
