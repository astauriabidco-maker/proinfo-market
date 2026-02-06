/**
 * Reservation Repository
 * Couche d'accès aux données pour les réservations
 * 
 * POINT BLOQUANT AUDIT #2 :
 * Utilise une transaction atomique pour éviter les race conditions
 */

import { PrismaClient, InventoryReservation, Prisma } from '@prisma/client';
import { ReservationEntity, AssetAlreadyReservedError } from '../domain/reservation.types';

export class ReservationRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une réservation de manière ATOMIQUE
     * 
     * Utilise une transaction Prisma pour :
     * 1. Vérifier qu'aucune réservation n'existe (dans la même transaction)
     * 2. Créer la réservation
     * 
     * Cela évite la race condition où deux processus tentent
     * de réserver le même asset simultanément.
     */
    async createAtomic(assetId: string, orderRef: string): Promise<ReservationEntity> {
        try {
            const reservation = await this.prisma.$transaction(async (tx) => {
                // Vérification atomique dans la transaction
                const existing = await tx.inventoryReservation.findUnique({
                    where: { assetId }
                });

                if (existing) {
                    throw new AssetAlreadyReservedError(assetId, existing.orderRef);
                }

                // Création garantie unique grâce à la transaction + contrainte @unique
                return tx.inventoryReservation.create({
                    data: { assetId, orderRef }
                });
            }, {
                // Niveau d'isolation pour éviter les lectures fantômes
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable
            });

            return this.toEntity(reservation);
        } catch (error) {
            // Si erreur de contrainte unique (cas rare de race condition)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Récupérer la réservation existante pour le message d'erreur
                const existing = await this.prisma.inventoryReservation.findUnique({
                    where: { assetId }
                });
                throw new AssetAlreadyReservedError(assetId, existing?.orderRef ?? 'unknown');
            }
            throw error;
        }
    }

    /**
     * Crée une réservation (méthode legacy, préférer createAtomic)
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
