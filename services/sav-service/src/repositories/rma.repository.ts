/**
 * RMA Repository
 * Couche d'accès aux données pour les RMA
 */

import { PrismaClient, Rma, RmaStatus } from '@prisma/client';
import { RmaEntity } from '../domain/rma.types';

export class RmaRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un RMA
     */
    async create(assetId: string, ticketId: string): Promise<RmaEntity> {
        const rma = await this.prisma.rma.create({
            data: {
                assetId,
                ticketId,
                status: RmaStatus.CREATED
            }
        });
        return this.toEntity(rma);
    }

    /**
     * Recherche un RMA par ID
     */
    async findById(id: string): Promise<RmaEntity | null> {
        const rma = await this.prisma.rma.findUnique({
            where: { id }
        });
        return rma ? this.toEntity(rma) : null;
    }

    /**
     * Recherche les RMA par ticketId
     */
    async findByTicketId(ticketId: string): Promise<RmaEntity[]> {
        const rmas = await this.prisma.rma.findMany({
            where: { ticketId },
            orderBy: { createdAt: 'desc' }
        });
        return rmas.map(r => this.toEntity(r));
    }

    /**
     * Recherche les RMA par assetId
     */
    async findByAssetId(assetId: string): Promise<RmaEntity[]> {
        const rmas = await this.prisma.rma.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return rmas.map(r => this.toEntity(r));
    }

    /**
     * Met à jour le statut d'un RMA
     */
    async updateStatus(id: string, status: RmaStatus): Promise<RmaEntity> {
        const rma = await this.prisma.rma.update({
            where: { id },
            data: { status }
        });
        return this.toEntity(rma);
    }

    /**
     * Convertit en entité
     */
    private toEntity(rma: Rma): RmaEntity {
        return {
            id: rma.id,
            assetId: rma.assetId,
            ticketId: rma.ticketId,
            status: rma.status,
            createdAt: rma.createdAt
        };
    }
}
