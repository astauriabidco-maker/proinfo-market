/**
 * Procurement Item Repository
 * Couche d'accès aux données pour les items de lot
 */

import { PrismaClient, ProcurementLotItem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ProcurementLotItemEntity } from '../domain/procurement.types';

export class ProcurementItemRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un item de lot (rattache un asset au lot)
     */
    async create(
        lotId: string,
        assetId: string,
        unitCost: number
    ): Promise<ProcurementLotItemEntity> {
        const item = await this.prisma.procurementLotItem.create({
            data: {
                lotId,
                assetId,
                unitCost: new Decimal(unitCost)
            }
        });

        return this.toEntity(item);
    }

    /**
     * Recherche un item par assetId
     */
    async findByAssetId(assetId: string): Promise<ProcurementLotItemEntity | null> {
        const item = await this.prisma.procurementLotItem.findUnique({
            where: { assetId }
        });

        return item ? this.toEntity(item) : null;
    }

    /**
     * Liste les items d'un lot
     */
    async findByLotId(lotId: string): Promise<ProcurementLotItemEntity[]> {
        const items = await this.prisma.procurementLotItem.findMany({
            where: { lotId },
            orderBy: { createdAt: 'asc' }
        });

        return items.map(item => this.toEntity(item));
    }

    /**
     * Compte les items d'un lot
     */
    async countByLotId(lotId: string): Promise<number> {
        return this.prisma.procurementLotItem.count({
            where: { lotId }
        });
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(item: ProcurementLotItem): ProcurementLotItemEntity {
        return {
            id: item.id,
            lotId: item.lotId,
            assetId: item.assetId,
            unitCost: item.unitCost,
            createdAt: item.createdAt
        };
    }
}
