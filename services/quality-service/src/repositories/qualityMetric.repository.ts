/**
 * Quality Metric Repository
 * Repository pour les métriques et alertes qualité
 * 
 * RÈGLE : Lecture analytique uniquement - aucune modification directe d'Assets
 */

import { PrismaClient, QualityAlertType } from '@prisma/client';
import {
    QualityMetricEntity,
    CreateMetricDto,
    MetricFilter,
    mapPrismaToEntity as mapMetricToEntity
} from '../domain/qualityMetric.types';
import {
    QualityAlertEntity,
    CreateAlertDto,
    AlertFilter,
    mapPrismaToEntity as mapAlertToEntity
} from '../domain/qualityAlert.types';

export class QualityMetricRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // ============================================
    // METRICS
    // ============================================

    /**
     * Enregistre une nouvelle métrique
     */
    async saveMetric(dto: CreateMetricDto): Promise<QualityMetricEntity> {
        const metric = await this.prisma.qualityMetric.create({
            data: {
                key: dto.key,
                value: dto.value,
                scope: dto.scope
            }
        });
        return mapMetricToEntity(metric);
    }

    /**
     * Récupère les métriques par filtre
     */
    async getMetrics(filter: MetricFilter): Promise<QualityMetricEntity[]> {
        const where: Record<string, unknown> = {};

        if (filter.key) where.key = filter.key;
        if (filter.scope) where.scope = filter.scope;
        if (filter.fromDate || filter.toDate) {
            where.createdAt = {};
            if (filter.fromDate) (where.createdAt as Record<string, Date>).gte = filter.fromDate;
            if (filter.toDate) (where.createdAt as Record<string, Date>).lte = filter.toDate;
        }

        const metrics = await this.prisma.qualityMetric.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return metrics.map(mapMetricToEntity);
    }

    /**
     * Récupère la dernière métrique pour un scope donné
     */
    async getLatestMetric(key: string, scope: string): Promise<QualityMetricEntity | null> {
        const metric = await this.prisma.qualityMetric.findFirst({
            where: { key, scope },
            orderBy: { createdAt: 'desc' }
        });
        return metric ? mapMetricToEntity(metric) : null;
    }

    /**
     * Récupère les métriques groupées par scope
     */
    async getMetricsByKey(key: string, limit = 50): Promise<QualityMetricEntity[]> {
        const metrics = await this.prisma.qualityMetric.findMany({
            where: { key },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
        return metrics.map(mapMetricToEntity);
    }

    // ============================================
    // ALERTS
    // ============================================

    /**
     * Crée une nouvelle alerte
     */
    async createAlert(dto: CreateAlertDto): Promise<QualityAlertEntity> {
        const alert = await this.prisma.qualityAlert.create({
            data: {
                type: dto.type,
                scope: dto.scope,
                reason: dto.reason,
                active: true
            }
        });
        return mapAlertToEntity(alert);
    }

    /**
     * Récupère les alertes par filtre
     */
    async getAlerts(filter: AlertFilter): Promise<QualityAlertEntity[]> {
        const where: Record<string, unknown> = {};

        if (filter.type) where.type = filter.type;
        if (filter.scope) where.scope = filter.scope;
        if (filter.active !== undefined) where.active = filter.active;

        const alerts = await this.prisma.qualityAlert.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
        return alerts.map(mapAlertToEntity);
    }

    /**
     * Récupère les alertes actives
     */
    async getActiveAlerts(): Promise<QualityAlertEntity[]> {
        return this.getAlerts({ active: true });
    }

    /**
     * Vérifie si une alerte active existe pour un scope
     */
    async hasActiveAlert(type: QualityAlertType, scope: string): Promise<boolean> {
        const count = await this.prisma.qualityAlert.count({
            where: { type, scope, active: true }
        });
        return count > 0;
    }

    /**
     * Récupère une alerte active pour un scope
     */
    async getActiveAlertForScope(type: QualityAlertType, scope: string): Promise<QualityAlertEntity | null> {
        const alert = await this.prisma.qualityAlert.findFirst({
            where: { type, scope, active: true }
        });
        return alert ? mapAlertToEntity(alert) : null;
    }

    /**
     * Désactive une alerte (ne supprime pas - historique préservé)
     */
    async clearAlert(alertId: string): Promise<QualityAlertEntity> {
        const alert = await this.prisma.qualityAlert.update({
            where: { id: alertId },
            data: { active: false }
        });
        return mapAlertToEntity(alert);
    }

    /**
     * Récupère une alerte par ID
     */
    async getAlertById(alertId: string): Promise<QualityAlertEntity | null> {
        const alert = await this.prisma.qualityAlert.findUnique({
            where: { id: alertId }
        });
        return alert ? mapAlertToEntity(alert) : null;
    }

    /**
     * Compte les alertes par type dans les X derniers jours
     */
    async countAlertsInPeriod(days: number, active?: boolean): Promise<{ created: number; cleared: number }> {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const created = await this.prisma.qualityAlert.count({
            where: {
                createdAt: { gte: fromDate },
                ...(active !== undefined ? { active } : {})
            }
        });

        // Pour les alertes cleared, on compte celles qui sont inactives et créées dans la période
        const cleared = await this.prisma.qualityAlert.count({
            where: {
                createdAt: { gte: fromDate },
                active: false
            }
        });

        return { created, cleared };
    }
}
