/**
 * Quality Result Repository
 * Couche d'accès aux données pour les résultats qualité
 * 
 * IMPORTANT : Append-only - pas d'update autorisé
 */

import { PrismaClient, QualityResult } from '@prisma/client';
import { QualityResultEntity, RecordQualityResultDto } from '../domain/qualityResult.types';

export class QualityResultRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un résultat qualité
     * Seule opération d'écriture autorisée
     */
    async create(
        assetId: string,
        dto: RecordQualityResultDto
    ): Promise<QualityResultEntity> {
        const result = await this.prisma.qualityResult.create({
            data: {
                assetId,
                checklistItemId: dto.checklistItemId,
                result: dto.result,
                measuredValue: dto.measuredValue ?? null
            }
        });

        return this.toEntity(result);
    }

    /**
     * Vérifie si un résultat existe déjà
     */
    async exists(assetId: string, checklistItemId: string): Promise<boolean> {
        const count = await this.prisma.qualityResult.count({
            where: { assetId, checklistItemId }
        });
        return count > 0;
    }

    /**
     * Récupère tous les résultats pour un asset
     */
    async findByAssetId(assetId: string): Promise<QualityResultEntity[]> {
        const results = await this.prisma.qualityResult.findMany({
            where: { assetId },
            orderBy: { createdAt: 'asc' }
        });

        return results.map(r => this.toEntity(r));
    }

    /**
     * Compte les résultats pour un asset
     */
    async countByAssetId(assetId: string): Promise<number> {
        return this.prisma.qualityResult.count({
            where: { assetId }
        });
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(result: QualityResult): QualityResultEntity {
        return {
            id: result.id,
            assetId: result.assetId,
            checklistItemId: result.checklistItemId,
            result: result.result,
            measuredValue: result.measuredValue,
            createdAt: result.createdAt
        };
    }

    // ❌ PAS DE MÉTHODE UPDATE
    // ❌ PAS DE MÉTHODE DELETE
    // L'historique qualité est APPEND-ONLY par design
}
