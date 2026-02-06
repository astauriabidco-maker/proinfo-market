/**
 * KPI Types
 * Types pour les KPIs opérationnels
 * 
 * RÈGLE : Si un KPI existe, il doit servir à décider.
 */

import { KpiPeriod, KpiFlag } from '@prisma/client';

// Re-export Prisma types
export { KpiPeriod, KpiFlag };

// ============================================
// KPI DEFINITIONS
// ============================================

export const KPI_KEYS = {
    // WMS
    WMS_AVG_TASK_TIME: 'WMS_AVG_TASK_TIME',
    WMS_BLOCKED_TASKS: 'WMS_BLOCKED_TASKS',
    WMS_QA_REWORK_RATE: 'WMS_QA_REWORK_RATE',

    // Stock
    STOCK_AVAILABLE: 'STOCK_AVAILABLE',
    STOCK_ROTATION: 'STOCK_ROTATION',
    STOCK_BLOCKED_QUALITY: 'STOCK_BLOCKED_QUALITY',

    // Qualité/SAV
    RMA_RATE: 'RMA_RATE',
    SAV_AVG_RESOLUTION: 'SAV_AVG_RESOLUTION',
    SCRAP_RATE: 'SCRAP_RATE',

    // Commercial
    B2B_AVG_BASKET: 'B2B_AVG_BASKET',
    QUOTE_CONVERSION: 'QUOTE_CONVERSION',
    QUOTE_TO_ORDER_TIME: 'QUOTE_TO_ORDER_TIME',

    // Achats
    MARGIN_VARIANCE: 'MARGIN_VARIANCE',
    LOT_REJECTION_RATE: 'LOT_REJECTION_RATE',
    RISKY_SUPPLIERS: 'RISKY_SUPPLIERS'
} as const;

export type KpiKey = typeof KPI_KEYS[keyof typeof KPI_KEYS];

// ============================================
// THRESHOLDS
// ============================================

export interface KpiThreshold {
    warning: number;
    critical?: number;
    direction: 'higher_is_bad' | 'lower_is_bad';
}

export const KPI_THRESHOLDS: Record<string, KpiThreshold> = {
    // WMS
    [KPI_KEYS.WMS_AVG_TASK_TIME]: { warning: 60, critical: 90, direction: 'higher_is_bad' },
    [KPI_KEYS.WMS_BLOCKED_TASKS]: { warning: 5, critical: 10, direction: 'higher_is_bad' },
    [KPI_KEYS.WMS_QA_REWORK_RATE]: { warning: 10, critical: 20, direction: 'higher_is_bad' },

    // Stock
    [KPI_KEYS.STOCK_BLOCKED_QUALITY]: { warning: 10, critical: 25, direction: 'higher_is_bad' },

    // Qualité/SAV
    [KPI_KEYS.RMA_RATE]: { warning: 5, critical: 10, direction: 'higher_is_bad' },
    [KPI_KEYS.SAV_AVG_RESOLUTION]: { warning: 7, critical: 14, direction: 'higher_is_bad' },
    [KPI_KEYS.SCRAP_RATE]: { warning: 2, critical: 5, direction: 'higher_is_bad' },

    // Commercial
    [KPI_KEYS.QUOTE_CONVERSION]: { warning: 30, direction: 'lower_is_bad' },
    [KPI_KEYS.QUOTE_TO_ORDER_TIME]: { warning: 5, critical: 10, direction: 'higher_is_bad' },

    // Achats
    [KPI_KEYS.MARGIN_VARIANCE]: { warning: 10, critical: 20, direction: 'higher_is_bad' },
    [KPI_KEYS.LOT_REJECTION_RATE]: { warning: 20, critical: 40, direction: 'higher_is_bad' }
};

// ============================================
// SNAPSHOT TYPES
// ============================================

export interface KpiSnapshotEntity {
    id: string;
    key: string;
    value: number;
    period: KpiPeriod;
    flag: KpiFlag;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

export interface CalculatedKpi {
    key: KpiKey;
    value: number;
    flag: KpiFlag;
    metadata?: Record<string, unknown>;
}

export interface KpiCalculationResult {
    period: KpiPeriod;
    calculatedAt: Date;
    kpis: CalculatedKpi[];
    flags: { key: string; flag: KpiFlag; reason: string }[];
}

// ============================================
// EVENTS
// ============================================

export function emitKpiCalculated(key: string, value: number): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'KpiCalculated',
        key,
        value,
        timestamp: new Date().toISOString()
    }));
}

export function emitKpiFlagRaised(key: string, flag: KpiFlag, reason: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'KpiFlagRaised',
        key,
        flag,
        reason,
        timestamp: new Date().toISOString()
    }));
}
