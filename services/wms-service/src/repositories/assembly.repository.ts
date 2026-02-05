/**
 * Assembly Repository
 * Couche d'accès aux données pour les ordres d'assemblage
 */

import { PrismaClient, AssemblyOrder, AssemblyStatus } from '@prisma/client';
import { AssemblyOrderEntity, AssemblyTask } from '../domain/assembly.types';

export class AssemblyRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un ordre d'assemblage
     */
    async create(assetId: string, tasks: AssemblyTask[]): Promise<AssemblyOrderEntity> {
        const order = await this.prisma.assemblyOrder.create({
            data: {
                assetId,
                tasks: JSON.stringify(tasks),
                status: AssemblyStatus.PENDING
            }
        });
        return this.toEntity(order);
    }

    /**
     * Recherche un ordre par ID
     */
    async findById(id: string): Promise<AssemblyOrderEntity | null> {
        const order = await this.prisma.assemblyOrder.findUnique({
            where: { id }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Recherche un ordre actif par assetId
     */
    async findActiveByAssetId(assetId: string): Promise<AssemblyOrderEntity | null> {
        const order = await this.prisma.assemblyOrder.findFirst({
            where: {
                assetId,
                status: { in: [AssemblyStatus.PENDING, AssemblyStatus.IN_PROGRESS] }
            }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Recherche le dernier ordre complété par assetId
     */
    async findCompletedByAssetId(assetId: string): Promise<AssemblyOrderEntity | null> {
        const order = await this.prisma.assemblyOrder.findFirst({
            where: {
                assetId,
                status: AssemblyStatus.COMPLETED
            },
            orderBy: { createdAt: 'desc' }
        });
        return order ? this.toEntity(order) : null;
    }

    /**
     * Met à jour le statut
     */
    async updateStatus(id: string, status: AssemblyStatus): Promise<AssemblyOrderEntity> {
        const order = await this.prisma.assemblyOrder.update({
            where: { id },
            data: { status }
        });
        return this.toEntity(order);
    }

    /**
     * Convertit en entité
     */
    private toEntity(order: AssemblyOrder): AssemblyOrderEntity {
        let tasks: AssemblyTask[];
        try {
            const parsed = typeof order.tasks === 'string' ? JSON.parse(order.tasks) : order.tasks;
            tasks = Array.isArray(parsed) ? parsed : [];
        } catch {
            tasks = [];
        }

        return {
            id: order.id,
            assetId: order.assetId,
            tasks,
            status: order.status,
            createdAt: order.createdAt
        };
    }
}
