/**
 * Quality Alert Types
 * Types pour les alertes qualité
 * 
 * RÈGLE : Les alertes sont informatives. Pas d'auto-correction.
 */

import { QualityAlert as PrismaQualityAlert, QualityAlertType } from '@prisma/client';

// Re-export Prisma enum
export { QualityAlertType };

// ============================================
// ENTITIES
// ============================================

export interface QualityAlertEntity {
    id: string;
    type: QualityAlertType;
    scope: string;
    reason: string;
    active: boolean;
    createdAt: Date;
}

// ============================================
// DTOs
// ============================================

export interface CreateAlertDto {
    type: QualityAlertType;
    scope: string;
    reason: string;
}

export interface AlertFilter {
    type?: QualityAlertType;
    scope?: string;
    active?: boolean;
}

// ============================================
// ANALYTICS SUMMARY
// ============================================

export interface QualitySummary {
    activeAlerts: QualityAlertEntity[];
    alertCounts: {
        model: number;
        supplier: number;
        batch: number;
    };
    trends: {
        newAlertsLast7Days: number;
        clearedAlertsLast7Days: number;
    };
}

// ============================================
// BLOCKING CHECK
// ============================================

export interface BlockingCheckResult {
    isBlocked: boolean;
    reason: string | null;
    alertId: string | null;
}

// ============================================
// ERRORS
// ============================================

export class AlertNotFoundError extends Error {
    constructor(alertId: string) {
        super(`Alert ${alertId} not found`);
        this.name = 'AlertNotFoundError';
    }
}

export class AlertAlreadyActiveError extends Error {
    constructor(type: QualityAlertType, scope: string) {
        super(`Alert already active for ${type}:${scope}`);
        this.name = 'AlertAlreadyActiveError';
    }
}

// ============================================
// MAPPERS
// ============================================

export function mapPrismaToEntity(prisma: PrismaQualityAlert): QualityAlertEntity {
    return {
        id: prisma.id,
        type: prisma.type,
        scope: prisma.scope,
        reason: prisma.reason,
        active: prisma.active,
        createdAt: prisma.createdAt
    };
}
