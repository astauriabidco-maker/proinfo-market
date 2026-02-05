/**
 * Return Repository
 * Couche d'accès aux données pour les retours
 */

import { PrismaClient, Return, ReturnStatus } from '@prisma/client';
import { ReturnEntity } from '../domain/return.types';

export class ReturnRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un retour
     */
    async create(assetId: string, reason: string): Promise<ReturnEntity> {
        const ret = await this.prisma.return.create({
            data: {
                assetId,
                reason,
                status: ReturnStatus.RECEIVED
            }
        });
        return this.toEntity(ret);
    }

    /**
     * Recherche un retour par ID
     */
    async findById(id: string): Promise<ReturnEntity | null> {
        const ret = await this.prisma.return.findUnique({
            where: { id }
        });
        return ret ? this.toEntity(ret) : null;
    }

    /**
     * Recherche par assetId
     */
    async findByAssetId(assetId: string): Promise<ReturnEntity[]> {
        const returns = await this.prisma.return.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return returns.map(r => this.toEntity(r));
    }

    /**
     * Met à jour le statut
     */
    async updateStatus(id: string, status: ReturnStatus): Promise<ReturnEntity> {
        const ret = await this.prisma.return.update({
            where: { id },
            data: { status }
        });
        return this.toEntity(ret);
    }

    /**
     * Convertit en entité
     */
    private toEntity(ret: Return): ReturnEntity {
        return {
            id: ret.id,
            assetId: ret.assetId,
            reason: ret.reason,
            status: ret.status,
            createdAt: ret.createdAt
        };
    }
}
