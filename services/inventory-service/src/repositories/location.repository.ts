/**
 * Location Repository
 * Couche d'accès aux données pour les emplacements
 */

import { PrismaClient, Location } from '@prisma/client';
import { CreateLocationDto, LocationEntity } from '../domain/location.types';

export class LocationRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un nouvel emplacement
     */
    async create(warehouseId: string, dto: CreateLocationDto): Promise<LocationEntity> {
        const location = await this.prisma.location.create({
            data: {
                warehouseId,
                code: dto.code,
                type: dto.type
            }
        });
        return this.toEntity(location);
    }

    /**
     * Recherche un emplacement par ID
     */
    async findById(id: string): Promise<LocationEntity | null> {
        const location = await this.prisma.location.findUnique({
            where: { id }
        });
        return location ? this.toEntity(location) : null;
    }

    /**
     * Vérifie si un emplacement existe déjà
     */
    async exists(warehouseId: string, code: string): Promise<boolean> {
        const count = await this.prisma.location.count({
            where: { warehouseId, code }
        });
        return count > 0;
    }

    /**
     * Liste les emplacements d'un entrepôt
     */
    async findByWarehouseId(warehouseId: string): Promise<LocationEntity[]> {
        const locations = await this.prisma.location.findMany({
            where: { warehouseId },
            orderBy: { code: 'asc' }
        });
        return locations.map(l => this.toEntity(l));
    }

    /**
     * Convertit un record Prisma en entité
     */
    private toEntity(location: Location): LocationEntity {
        return {
            id: location.id,
            warehouseId: location.warehouseId,
            code: location.code,
            type: location.type,
            createdAt: location.createdAt
        };
    }
}
