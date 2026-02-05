/**
 * Shipment Repository
 * Couche d'accès aux données pour les expéditions
 */

import { PrismaClient, Shipment, ShipmentStatus } from '@prisma/client';
import { ShipmentEntity } from '../domain/shipment.types';

export class ShipmentRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une expédition
     */
    async create(assetId: string, carrier: string): Promise<ShipmentEntity> {
        const shipment = await this.prisma.shipment.create({
            data: {
                assetId,
                carrier,
                status: ShipmentStatus.READY
            }
        });
        return this.toEntity(shipment);
    }

    /**
     * Recherche une expédition par ID
     */
    async findById(id: string): Promise<ShipmentEntity | null> {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id }
        });
        return shipment ? this.toEntity(shipment) : null;
    }

    /**
     * Recherche par assetId
     */
    async findByAssetId(assetId: string): Promise<ShipmentEntity | null> {
        const shipment = await this.prisma.shipment.findFirst({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return shipment ? this.toEntity(shipment) : null;
    }

    /**
     * Met à jour le statut et le tracking
     */
    async update(
        id: string,
        data: { status?: ShipmentStatus; trackingRef?: string }
    ): Promise<ShipmentEntity> {
        const shipment = await this.prisma.shipment.update({
            where: { id },
            data
        });
        return this.toEntity(shipment);
    }

    /**
     * Convertit en entité
     */
    private toEntity(shipment: Shipment): ShipmentEntity {
        return {
            id: shipment.id,
            assetId: shipment.assetId,
            carrier: shipment.carrier,
            trackingRef: shipment.trackingRef,
            status: shipment.status,
            createdAt: shipment.createdAt
        };
    }
}
