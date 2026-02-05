/**
 * Checklist Item Repository
 * Couche d'accès aux données pour les items de checklist
 */

import { PrismaClient, QualityChecklistItem } from '@prisma/client';
import { ChecklistItemEntity } from '../domain/checklist.types';

export class ChecklistItemRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Recherche un item par ID
     */
    async findById(id: string): Promise<ChecklistItemEntity | null> {
        const item = await this.prisma.qualityChecklistItem.findUnique({
            where: { id }
        });

        return item ? this.toEntity(item) : null;
    }

    /**
     * Liste les items d'une checklist
     */
    async findByChecklistId(checklistId: string): Promise<ChecklistItemEntity[]> {
        const items = await this.prisma.qualityChecklistItem.findMany({
            where: { checklistId },
            orderBy: { code: 'asc' }
        });

        return items.map(item => this.toEntity(item));
    }

    /**
     * Compte les items d'une checklist
     */
    async countByChecklistId(checklistId: string): Promise<number> {
        return this.prisma.qualityChecklistItem.count({
            where: { checklistId }
        });
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(item: QualityChecklistItem): ChecklistItemEntity {
        return {
            id: item.id,
            checklistId: item.checklistId,
            code: item.code,
            description: item.description,
            isBlocking: item.isBlocking
        };
    }
}
