/**
 * Procurement Lot Repository
 * Couche d'accès aux données pour les lots d'achat
 */

import { PrismaClient, ProcurementLot, SupplierType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateProcurementLotDto, ProcurementLotEntity } from '../domain/procurement.types';

export class ProcurementLotRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un nouveau lot d'achat
     */
    async create(dto: CreateProcurementLotDto): Promise<ProcurementLotEntity> {
        const lot = await this.prisma.procurementLot.create({
            data: {
                supplierName: dto.supplierName,
                supplierType: dto.supplierType,
                purchaseDate: new Date(dto.purchaseDate),
                totalUnitsDeclared: dto.totalUnitsDeclared,
                totalPurchasePrice: new Decimal(dto.totalPurchasePrice)
            }
        });

        return this.toEntity(lot);
    }

    /**
     * Recherche un lot par ID
     */
    async findById(id: string): Promise<ProcurementLotEntity | null> {
        const lot = await this.prisma.procurementLot.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });

        if (!lot) return null;

        return {
            ...this.toEntity(lot),
            itemCount: lot._count.items
        };
    }

    /**
     * Liste tous les lots (pagination basique)
     */
    async findAll(limit = 100, offset = 0): Promise<ProcurementLotEntity[]> {
        const lots = await this.prisma.procurementLot.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { items: true }
                }
            }
        });

        return lots.map(lot => ({
            ...this.toEntity(lot),
            itemCount: lot._count.items
        }));
    }

    /**
     * Compte le nombre d'items dans un lot
     */
    async countItems(lotId: string): Promise<number> {
        return this.prisma.procurementLotItem.count({
            where: { lotId }
        });
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(lot: ProcurementLot): ProcurementLotEntity {
        return {
            id: lot.id,
            supplierName: lot.supplierName,
            supplierType: lot.supplierType,
            purchaseDate: lot.purchaseDate,
            totalUnitsDeclared: lot.totalUnitsDeclared,
            totalPurchasePrice: lot.totalPurchasePrice,
            createdAt: lot.createdAt
        };
    }
}
