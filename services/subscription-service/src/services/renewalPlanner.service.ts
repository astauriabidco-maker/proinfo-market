/**
 * Renewal Planner Service
 * Planification et exécution des renouvellements
 * 
 * RÈGLES :
 * - Pas de renouvellement tacite
 * - Renouvellement = proposition, pas obligation
 * - Exécution explicite requise
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
    RenewalPlanEntity,
    RenewalPlanView,
    ExecuteRenewalDto,
    PendingNotification,
    RenewalNotFoundError,
    RenewalAlreadyExecutedError,
    AutoRenewalNotAllowedError
} from '../domain/renewalPlan.types';
import { SubscriptionEventData } from '../domain/assetLifecycle.types';

export class RenewalPlannerService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Récupérer un plan de renouvellement
     */
    async getRenewalPlan(renewalId: string): Promise<RenewalPlanView> {
        const renewal = await this.prisma.renewalPlan.findUnique({
            where: { id: renewalId },
            include: { contract: true }
        });

        if (!renewal) {
            throw new RenewalNotFoundError(renewalId);
        }

        const daysUntilRenewal = Math.ceil(
            (renewal.plannedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return {
            id: renewal.id,
            contractId: renewal.contractId,
            companyName: renewal.contract.companyName,
            plannedDate: renewal.plannedDate.toISOString(),
            status: renewal.status,
            daysUntilRenewal,
            notifications: {
                at90: !!renewal.notifiedAt90,
                at60: !!renewal.notifiedAt60,
                at30: !!renewal.notifiedAt30
            }
        };
    }

    /**
     * Récupérer les plans de renouvellement à venir
     */
    async getUpcomingRenewals(daysAhead: number = 90): Promise<RenewalPlanView[]> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);

        const renewals = await this.prisma.renewalPlan.findMany({
            where: {
                plannedDate: { lte: cutoff },
                status: { in: ['PLANNED', 'NOTIFIED'] }
            },
            include: { contract: true },
            orderBy: { plannedDate: 'asc' }
        });

        return renewals.map(r => {
            const daysUntilRenewal = Math.ceil(
                (r.plannedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return {
                id: r.id,
                contractId: r.contractId,
                companyName: r.contract.companyName,
                plannedDate: r.plannedDate.toISOString(),
                status: r.status,
                daysUntilRenewal,
                notifications: {
                    at90: !!r.notifiedAt90,
                    at60: !!r.notifiedAt60,
                    at30: !!r.notifiedAt30
                }
            };
        });
    }

    /**
     * Vérifier les notifications à envoyer (J-90, J-60, J-30)
     * RÈGLE : Pas de spam client
     */
    async checkPendingNotifications(): Promise<PendingNotification[]> {
        const now = new Date();
        const pending: PendingNotification[] = [];

        const renewals = await this.prisma.renewalPlan.findMany({
            where: { status: { in: ['PLANNED', 'NOTIFIED'] } },
            include: { contract: true }
        });

        for (const r of renewals) {
            const daysRemaining = Math.ceil(
                (r.plannedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            // J-90
            if (daysRemaining <= 90 && daysRemaining > 60 && !r.notifiedAt90) {
                pending.push({
                    renewalId: r.id,
                    contractId: r.contractId,
                    companyId: r.contract.companyId,
                    companyName: r.contract.companyName,
                    daysRemaining,
                    notificationType: 'J-90'
                });
            }

            // J-60
            if (daysRemaining <= 60 && daysRemaining > 30 && !r.notifiedAt60) {
                pending.push({
                    renewalId: r.id,
                    contractId: r.contractId,
                    companyId: r.contract.companyId,
                    companyName: r.contract.companyName,
                    daysRemaining,
                    notificationType: 'J-60'
                });
            }

            // J-30
            if (daysRemaining <= 30 && !r.notifiedAt30) {
                pending.push({
                    renewalId: r.id,
                    contractId: r.contractId,
                    companyId: r.contract.companyId,
                    companyName: r.contract.companyName,
                    daysRemaining,
                    notificationType: 'J-30'
                });
            }
        }

        return pending;
    }

    /**
     * Marquer une notification comme envoyée
     */
    async markNotificationSent(renewalId: string, type: 'J-90' | 'J-60' | 'J-30'): Promise<void> {
        const now = new Date();
        const updateData: Record<string, Date> = {};

        if (type === 'J-90') updateData.notifiedAt90 = now;
        if (type === 'J-60') updateData.notifiedAt60 = now;
        if (type === 'J-30') updateData.notifiedAt30 = now;

        await this.prisma.renewalPlan.update({
            where: { id: renewalId },
            data: { ...updateData, status: 'NOTIFIED' }
        });

        console.log(`[RENEWAL] Notification ${type} sent for renewal ${renewalId}`);
    }

    /**
     * Exécuter un renouvellement (EXPLICITE)
     * RÈGLE : Pas de renouvellement automatique
     */
    async executeRenewal(renewalId: string, dto: ExecuteRenewalDto): Promise<void> {
        const renewal = await this.prisma.renewalPlan.findUnique({
            where: { id: renewalId },
            include: { contract: { include: { assets: true } } }
        });

        if (!renewal) {
            throw new RenewalNotFoundError(renewalId);
        }

        if (renewal.status === 'EXECUTED') {
            throw new RenewalAlreadyExecutedError(renewalId);
        }

        // RÈGLE STRICTE : Exécution explicite requise
        if (!dto.executedBy) {
            throw new AutoRenewalNotAllowedError();
        }

        await this.prisma.$transaction(async (tx) => {
            // 1. Marquer comme exécuté
            await tx.renewalPlan.update({
                where: { id: renewalId },
                data: {
                    status: 'EXECUTED',
                    executedAt: new Date(),
                    executedBy: dto.executedBy
                }
            });

            // 2. Logger l'événement
            await tx.subscriptionEvent.create({
                data: {
                    eventType: 'RenewalExecuted',
                    entityType: 'RenewalPlan',
                    entityId: renewalId,
                    companyId: renewal.contract.companyId,
                    data: JSON.stringify({ executedBy: dto.executedBy })
                }
            });
        });

        console.log(`[RENEWAL] Executed renewal ${renewalId} by ${dto.executedBy}`);
    }

    /**
     * Annuler un renouvellement
     */
    async cancelRenewal(renewalId: string): Promise<void> {
        await this.prisma.renewalPlan.update({
            where: { id: renewalId },
            data: { status: 'CANCELLED' }
        });

        console.log(`[RENEWAL] Cancelled renewal ${renewalId}`);
    }

    /**
     * Bloquer toute tentative de renouvellement automatique
     */
    attemptAutoRenewal(): never {
        throw new AutoRenewalNotAllowedError();
    }
}
