/**
 * Operator Repository
 * Accès données pour les opérateurs WMS
 */

import { PrismaClient, Operator } from '@prisma/client';
import { OperatorEntity, CreateOperatorDto } from '../domain/operator.types';

export class OperatorRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un opérateur
     */
    async create(dto: CreateOperatorDto): Promise<OperatorEntity> {
        const operator = await this.prisma.operator.create({
            data: {
                name: dto.name,
                badge: dto.badge
            }
        });
        return this.toEntity(operator);
    }

    /**
     * Récupère un opérateur par ID
     */
    async findById(operatorId: string): Promise<OperatorEntity | null> {
        const operator = await this.prisma.operator.findUnique({
            where: { id: operatorId }
        });
        return operator ? this.toEntity(operator) : null;
    }

    /**
     * Récupère un opérateur par badge
     */
    async findByBadge(badge: string): Promise<OperatorEntity | null> {
        const operator = await this.prisma.operator.findUnique({
            where: { badge }
        });
        return operator ? this.toEntity(operator) : null;
    }

    /**
     * Vérifie si un badge existe
     */
    async badgeExists(badge: string): Promise<boolean> {
        const count = await this.prisma.operator.count({
            where: { badge }
        });
        return count > 0;
    }

    /**
     * Liste tous les opérateurs
     */
    async findAll(): Promise<OperatorEntity[]> {
        const operators = await this.prisma.operator.findMany({
            orderBy: { name: 'asc' }
        });
        return operators.map(o => this.toEntity(o));
    }

    private toEntity(operator: Operator): OperatorEntity {
        return {
            id: operator.id,
            name: operator.name,
            badge: operator.badge,
            createdAt: operator.createdAt
        };
    }
}
