/**
 * Warehouse Repository
 * Couche d'accès aux données pour les entrepôts
 */

import { PrismaClient, Warehouse } from '@prisma/client';
import { CreateWarehouseDto, WarehouseEntity } from '../domain/location.types';

export class WarehouseRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un nouvel entrepôt
     */
    async create(dto: CreateWarehouseDto): Promise<WarehouseEntity> {
        const warehouse = await this.prisma.warehouse.create({
            data: {
                name: dto.name,
                code: dto.code || dto.name.toUpperCase().replace(/\s+/g, '-'),
                country: dto.country || 'FR'
            }
        });
        return this.toEntity(warehouse);
    }

    /**
     * Recherche un entrepôt par ID
     */
    async findById(id: string): Promise<WarehouseEntity | null> {
        const warehouse = await this.prisma.warehouse.findUnique({
            where: { id },
            include: { locations: true }
        });
        return warehouse ? this.toEntity(warehouse) : null;
    }

    /**
     * Liste tous les entrepôts
     */
    async findAll(): Promise<WarehouseEntity[]> {
        const warehouses = await this.prisma.warehouse.findMany({
            include: { locations: true },
            orderBy: { name: 'asc' }
        });
        return warehouses.map(w => this.toEntity(w));
    }

    /**
     * Convertit un record Prisma en entité
     */
    private toEntity(warehouse: Warehouse & { locations?: any[] }): WarehouseEntity {
        return {
            id: warehouse.id,
            name: warehouse.name,
            createdAt: warehouse.createdAt,
            locations: warehouse.locations?.map(loc => ({
                id: loc.id,
                warehouseId: loc.warehouseId,
                code: loc.code,
                type: loc.type,
                createdAt: loc.createdAt
            }))
        };
    }
}
