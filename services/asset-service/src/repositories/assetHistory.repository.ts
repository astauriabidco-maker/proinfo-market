/**
 * Asset History Repository
 * Couche d'accès aux données pour l'historique des états
 * 
 * IMPORTANT : L'historique est IMMUABLE - pas de update ni delete
 */

import { PrismaClient, AssetStateHistory, AssetStatus } from '@prisma/client';
import { AssetStateHistoryEntry } from '../domain/asset.types';

export class AssetHistoryRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une entrée d'historique
     * Seule opération d'écriture autorisée
     */
    async create(
        assetId: string,
        previousStatus: AssetStatus | null,
        newStatus: AssetStatus,
        reason?: string
    ): Promise<AssetStateHistoryEntry> {
        const entry = await this.prisma.assetStateHistory.create({
            data: {
                assetId,
                previousStatus,
                newStatus,
                reason: reason ?? null
            }
        });

        return this.toEntry(entry);
    }

    /**
     * Récupère l'historique complet d'un asset
     * Ordonné du plus ancien au plus récent
     */
    async findByAssetId(assetId: string): Promise<AssetStateHistoryEntry[]> {
        const entries = await this.prisma.assetStateHistory.findMany({
            where: { assetId },
            orderBy: { createdAt: 'asc' }
        });

        return entries.map(e => this.toEntry(e));
    }

    /**
     * Récupère la dernière entrée d'historique d'un asset
     */
    async findLastByAssetId(assetId: string): Promise<AssetStateHistoryEntry | null> {
        const entry = await this.prisma.assetStateHistory.findFirst({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });

        return entry ? this.toEntry(entry) : null;
    }

    /**
     * Compte le nombre d'entrées d'historique pour un asset
     */
    async countByAssetId(assetId: string): Promise<number> {
        return this.prisma.assetStateHistory.count({
            where: { assetId }
        });
    }

    /**
     * Convertit un record Prisma en entrée d'historique
     */
    private toEntry(record: AssetStateHistory): AssetStateHistoryEntry {
        return {
            id: record.id,
            assetId: record.assetId,
            previousStatus: record.previousStatus,
            newStatus: record.newStatus,
            reason: record.reason,
            createdAt: record.createdAt
        };
    }

    // ❌ PAS DE MÉTHODE UPDATE
    // ❌ PAS DE MÉTHODE DELETE
    // L'historique est IMMUABLE par design
}
