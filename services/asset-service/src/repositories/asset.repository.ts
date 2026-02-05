/**
 * Asset Repository
 * Couche d'accès aux données pour les Assets
 */

import { PrismaClient, Asset, AssetStatus, AssetType, AssetGrade } from '@prisma/client';
import { CreateAssetDto, AssetEntity } from '../domain/asset.types';

export class AssetRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un nouvel asset avec le statut initial ACQUIRED
     */
    async create(dto: CreateAssetDto): Promise<AssetEntity> {
        const asset = await this.prisma.asset.create({
            data: {
                serialNumber: dto.serialNumber,
                assetType: dto.assetType,
                brand: dto.brand,
                model: dto.model,
                chassisRef: dto.chassisRef ?? null,
                status: AssetStatus.ACQUIRED,
                grade: null
            }
        });

        return this.toEntity(asset);
    }

    /**
     * Recherche un asset par ID
     */
    async findById(id: string): Promise<AssetEntity | null> {
        const asset = await this.prisma.asset.findUnique({
            where: { id }
        });

        return asset ? this.toEntity(asset) : null;
    }

    /**
     * Recherche un asset par numéro de série
     */
    async findBySerialNumber(serialNumber: string): Promise<AssetEntity | null> {
        const asset = await this.prisma.asset.findUnique({
            where: { serialNumber }
        });

        return asset ? this.toEntity(asset) : null;
    }

    /**
     * Met à jour le statut d'un asset
     */
    async updateStatus(id: string, newStatus: AssetStatus): Promise<AssetEntity> {
        const asset = await this.prisma.asset.update({
            where: { id },
            data: { status: newStatus }
        });

        return this.toEntity(asset);
    }

    /**
     * Met à jour le grade d'un asset
     */
    async updateGrade(id: string, grade: AssetGrade): Promise<AssetEntity> {
        const asset = await this.prisma.asset.update({
            where: { id },
            data: { grade }
        });

        return this.toEntity(asset);
    }

    /**
     * Liste tous les assets (pagination basique)
     */
    async findAll(limit = 100, offset = 0): Promise<AssetEntity[]> {
        const assets = await this.prisma.asset.findMany({
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });

        return assets.map(a => this.toEntity(a));
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(asset: Asset): AssetEntity {
        return {
            id: asset.id,
            serialNumber: asset.serialNumber,
            assetType: asset.assetType,
            brand: asset.brand,
            model: asset.model,
            chassisRef: asset.chassisRef,
            status: asset.status,
            grade: asset.grade,
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt
        };
    }
}
