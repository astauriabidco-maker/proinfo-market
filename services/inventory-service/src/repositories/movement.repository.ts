/**
 * Movement Repository
 * Couche d'accès aux données pour les mouvements
 * 
 * IMPORTANT : Append-only - pas d'update autorisé
 */

import { PrismaClient, InventoryMovement, MovementReason } from '@prisma/client';
import { MovementEntity, AssetPosition } from '../domain/movement.types';

export class MovementRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un mouvement
     * Seule opération d'écriture autorisée
     */
    async create(
        assetId: string,
        fromLocation: string | null,
        toLocation: string | null,
        reason: MovementReason
    ): Promise<MovementEntity> {
        const movement = await this.prisma.inventoryMovement.create({
            data: {
                assetId,
                fromLocation,
                toLocation,
                reason
            }
        });
        return this.toEntity(movement);
    }

    /**
     * Récupère l'historique des mouvements d'un asset
     */
    async findByAssetId(assetId: string): Promise<MovementEntity[]> {
        const movements = await this.prisma.inventoryMovement.findMany({
            where: { assetId },
            orderBy: { createdAt: 'asc' }
        });
        return movements.map(m => this.toEntity(m));
    }

    /**
     * Récupère le dernier mouvement d'un asset (position courante)
     */
    async findLastByAssetId(assetId: string): Promise<MovementEntity | null> {
        const movement = await this.prisma.inventoryMovement.findFirst({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return movement ? this.toEntity(movement) : null;
    }

    /**
     * Calcule la position courante d'un asset
     * La position = toLocation du dernier mouvement
     */
    async getCurrentPosition(assetId: string): Promise<AssetPosition> {
        const lastMovement = await this.findLastByAssetId(assetId);

        return {
            assetId,
            locationId: lastMovement?.toLocation ?? null,
            lastMovement: lastMovement ?? undefined
        };
    }

    /**
     * Compte les mouvements d'un asset
     */
    async countByAssetId(assetId: string): Promise<number> {
        return this.prisma.inventoryMovement.count({
            where: { assetId }
        });
    }

    /**
     * Convertit un record Prisma en entité
     */
    private toEntity(movement: InventoryMovement): MovementEntity {
        return {
            id: movement.id,
            assetId: movement.assetId,
            fromLocation: movement.fromLocation,
            toLocation: movement.toLocation,
            reason: movement.reason,
            createdAt: movement.createdAt
        };
    }

    // ❌ PAS DE MÉTHODE UPDATE
    // ❌ PAS DE MÉTHODE DELETE
    // Les mouvements sont APPEND-ONLY par design
}
