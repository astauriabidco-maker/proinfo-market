/**
 * Checklist Repository
 * Couche d'accès aux données pour les checklists
 */

import { PrismaClient, QualityChecklist, AssetType } from '@prisma/client';
import { CreateChecklistDto, ChecklistEntity } from '../domain/checklist.types';

export class ChecklistRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une nouvelle checklist avec ses items
     */
    async create(dto: CreateChecklistDto): Promise<ChecklistEntity> {
        const checklist = await this.prisma.qualityChecklist.create({
            data: {
                name: dto.name,
                assetType: dto.assetType,
                version: dto.version,
                items: {
                    create: dto.items.map(item => ({
                        code: item.code,
                        description: item.description,
                        isBlocking: item.isBlocking
                    }))
                }
            },
            include: { items: true }
        });

        return this.toEntity(checklist);
    }

    /**
     * Recherche une checklist par ID
     */
    async findById(id: string): Promise<ChecklistEntity | null> {
        const checklist = await this.prisma.qualityChecklist.findUnique({
            where: { id },
            include: { items: true }
        });

        return checklist ? this.toEntity(checklist) : null;
    }

    /**
     * Recherche la dernière version de checklist pour un type d'asset
     */
    async findLatestByAssetType(assetType: AssetType): Promise<ChecklistEntity | null> {
        const checklist = await this.prisma.qualityChecklist.findFirst({
            where: { assetType },
            orderBy: { version: 'desc' },
            include: { items: true }
        });

        return checklist ? this.toEntity(checklist) : null;
    }

    /**
     * Vérifie si une checklist existe déjà
     */
    async exists(name: string, assetType: AssetType, version: number): Promise<boolean> {
        const count = await this.prisma.qualityChecklist.count({
            where: { name, assetType, version }
        });
        return count > 0;
    }

    /**
     * Liste toutes les checklists
     */
    async findAll(): Promise<ChecklistEntity[]> {
        const checklists = await this.prisma.qualityChecklist.findMany({
            orderBy: [{ assetType: 'asc' }, { version: 'desc' }],
            include: { items: true }
        });

        return checklists.map(c => this.toEntity(c));
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(checklist: QualityChecklist & { items?: any[] }): ChecklistEntity {
        return {
            id: checklist.id,
            name: checklist.name,
            assetType: checklist.assetType,
            version: checklist.version,
            createdAt: checklist.createdAt,
            items: checklist.items?.map(item => ({
                id: item.id,
                checklistId: item.checklistId,
                code: item.code,
                description: item.description,
                isBlocking: item.isBlocking
            }))
        };
    }
}
