/**
 * Reservation Repository
 * Couche d'accès aux données pour les réservations
 */

import { PrismaClient, InventoryReservation } from '@prisma/client';
import { ReservationEntity } from '../domain/reservation.types';

export class ReservationRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une réservation
     */
    async create(assetId: string, orderRef: string): Promise<ReservationEntity> {
        const reservation = await this.prisma.inventoryReservation.create({
            data: { assetId, orderRef }
        });
        return this.toEntity(reservation);
    }

    /**
     * Recherche une réservation par assetId
     */
    async findByAssetId(assetId: string): Promise<ReservationEntity | null> {
        const reservation = await this.prisma.inventoryReservation.findUnique({
            where: { assetId }
        });
        return reservation ? this.toEntity(reservation) : null;
    }

    /**
     * Vérifie si un asset est réservé
     */
    async isReserved(assetId: string): Promise<boolean> {
        const count = await this.prisma.inventoryReservation.count({
            where: { assetId }
        });
        return count > 0;
    }

    /**
     * Supprime une réservation
     */
    async delete(assetId: string): Promise<void> {
        await this.prisma.inventoryReservation.delete({
            where: { assetId }
        });
    }

    /**
     * Liste les réservations par orderRef
     */
    async findByOrderRef(orderRef: string): Promise<ReservationEntity[]> {
        const reservations = await this.prisma.inventoryReservation.findMany({
            where: { orderRef },
            orderBy: { createdAt: 'asc' }
        });
        return reservations.map(r => this.toEntity(r));
    }

    /**
     * Convertit un record Prisma en entité
     */
    private toEntity(reservation: InventoryReservation): ReservationEntity {
        return {
            id: reservation.id,
            assetId: reservation.assetId,
            orderRef: reservation.orderRef,
            createdAt: reservation.createdAt
        };
    }
}
