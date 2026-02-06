/**
 * Decision Log Service
 * Journal des décisions humaines
 * 
 * RÈGLE : Append-only, jamais modifié
 */

import { PrismaClient } from '@prisma/client';
import {
    DecisionLogEntity,
    DecisionLogView,
    CreateDecisionLogDto,
    DecisionLogQuery
} from '../domain/decisionLog.types';

export class DecisionLogService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Logger une décision humaine
     * APPEND-ONLY : jamais de modification
     */
    async logDecision(dto: CreateDecisionLogDto): Promise<DecisionLogEntity> {
        const log = await this.prisma.decisionLog.create({
            data: {
                actorId: dto.actorId,
                actorName: dto.actorName || null,
                action: dto.action,
                entityType: dto.entityType || null,
                entityId: dto.entityId || null,
                context: dto.context ? JSON.stringify(dto.context) : null,
                delegatedBy: dto.delegatedBy || null
            }
        });

        // Logger l'événement
        await this.prisma.governanceEvent.create({
            data: {
                eventType: 'DecisionLogged',
                actorId: dto.actorId,
                data: JSON.stringify({ action: dto.action, entityType: dto.entityType })
            }
        });

        console.log(`[DECISION] ${dto.actorId} executed ${dto.action}${dto.delegatedBy ? ` (delegated by ${dto.delegatedBy})` : ''}`);

        return this.toEntity(log);
    }

    /**
     * Récupérer les décisions (audit interne)
     */
    async getDecisions(query: DecisionLogQuery): Promise<DecisionLogView[]> {
        const where: any = {};

        // Filter by period
        if (query.period) {
            const now = new Date();
            const daysMap = {
                'LAST_7_DAYS': 7,
                'LAST_30_DAYS': 30,
                'LAST_90_DAYS': 90
            };
            const days = daysMap[query.period];
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            where.createdAt = { gte: cutoff };
        }

        // Filter by actor
        if (query.actorId) {
            where.actorId = query.actorId;
        }

        // Filter by action
        if (query.action) {
            where.action = query.action;
        }

        const logs = await this.prisma.decisionLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: query.limit || 100
        });

        return logs.map(l => this.toView(l));
    }

    /**
     * Récupérer les décisions d'un utilisateur
     */
    async getDecisionsByActor(actorId: string): Promise<DecisionLogView[]> {
        const logs = await this.prisma.decisionLog.findMany({
            where: { actorId },
            orderBy: { createdAt: 'desc' }
        });

        return logs.map(l => this.toView(l));
    }

    /**
     * Statistiques pour observabilité
     */
    async getDecisionStats(period: 'LAST_7_DAYS' | 'LAST_30_DAYS'): Promise<{
        total: number;
        byAction: Record<string, number>;
        byActor: Record<string, number>;
    }> {
        const days = period === 'LAST_7_DAYS' ? 7 : 30;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const logs = await this.prisma.decisionLog.findMany({
            where: { createdAt: { gte: cutoff } }
        });

        const byAction: Record<string, number> = {};
        const byActor: Record<string, number> = {};

        for (const log of logs) {
            byAction[log.action] = (byAction[log.action] || 0) + 1;
            byActor[log.actorId] = (byActor[log.actorId] || 0) + 1;
        }

        return {
            total: logs.length,
            byAction,
            byActor
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    private toEntity(log: any): DecisionLogEntity {
        return {
            id: log.id,
            actorId: log.actorId,
            actorName: log.actorName,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            context: log.context ? JSON.parse(log.context) : null,
            delegatedBy: log.delegatedBy,
            createdAt: log.createdAt
        };
    }

    private toView(log: any): DecisionLogView {
        return {
            id: log.id,
            actorId: log.actorId,
            actorName: log.actorName,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            context: log.context ? JSON.parse(log.context) : null,
            delegatedBy: log.delegatedBy,
            createdAt: log.createdAt.toISOString()
        };
    }
}
