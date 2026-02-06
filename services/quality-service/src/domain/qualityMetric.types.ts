/**
 * Quality Metric Types
 * Types pour les métriques qualité analytiques
 * 
 * RÈGLE : Lecture analytique uniquement - aucune métrique ne modifie un Asset directement
 */

import { QualityMetric as PrismaQualityMetric } from '@prisma/client';

// ============================================
// ENUMS
// ============================================

/**
 * Types de métriques calculées
 */
export enum MetricKey {
    RMA_RATE = 'RMA_RATE',              // Taux de RMA (%)
    TIME_TO_FAILURE = 'TIME_TO_FAILURE', // Temps moyen avant panne (jours)
    BLOCKED_RATE = 'BLOCKED_RATE'        // % d'Assets bloqués qualité
}

// ============================================
// ENTITIES
// ============================================

export interface QualityMetricEntity {
    id: string;
    key: string;
    value: number;
    scope: string;
    createdAt: Date;
}

// ============================================
// DTOs
// ============================================

export interface CreateMetricDto {
    key: MetricKey;
    value: number;
    scope: string;
}

export interface MetricFilter {
    key?: MetricKey;
    scope?: string;
    fromDate?: Date;
    toDate?: Date;
}

// ============================================
// ANALYTICS RESULTS
// ============================================

export interface RmaRateResult {
    scope: string;      // model or supplier id
    totalAssets: number;
    rmaCount: number;
    rmaRate: number;    // percentage
}

export interface MetricsSummary {
    metrics: QualityMetricEntity[];
    lastCalculatedAt: Date | null;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Seuil d'alerte RMA (%)
 * Si RMA_RATE > 5% sur 30 jours → ALERTE
 */
export const RMA_RATE_THRESHOLD = 5;

/**
 * Période d'analyse par défaut (jours)
 */
export const DEFAULT_ANALYSIS_PERIOD_DAYS = 30;

// ============================================
// MAPPERS
// ============================================

export function mapPrismaToEntity(prisma: PrismaQualityMetric): QualityMetricEntity {
    return {
        id: prisma.id,
        key: prisma.key,
        value: prisma.value,
        scope: prisma.scope,
        createdAt: prisma.createdAt
    };
}
