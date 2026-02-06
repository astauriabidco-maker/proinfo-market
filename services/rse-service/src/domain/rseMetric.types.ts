/**
 * RSE Metric Types
 * Types pour les métriques RSE par asset
 * 
 * RÈGLE : Une métrique = un asset + un type + une méthode
 * Jamais de recalcul rétroactif
 */

/**
 * Types de métriques supportées v1
 */
export type MetricType = 'CO2_AVOIDED' | 'WATER_SAVED' | 'MATERIAL_SAVED';

/**
 * Unités par type de métrique
 */
export const METRIC_UNITS: Record<MetricType, string> = {
    CO2_AVOIDED: 'kg',
    WATER_SAVED: 'L',
    MATERIAL_SAVED: 'kg'
};

/**
 * Labels lisibles par type
 */
export const METRIC_LABELS: Record<MetricType, string> = {
    CO2_AVOIDED: 'CO₂ évité',
    WATER_SAVED: 'Eau économisée',
    MATERIAL_SAVED: 'Matières évitées'
};

/**
 * DTO pour création de métriques
 */
export interface CreateMetricDto {
    assetId: string;
    metricType: MetricType;
    value: number;
    unit: string;
    methodologyId: string;
}

/**
 * Entité métrique persistée
 */
export interface RseMetricEntity {
    id: string;
    assetId: string;
    metricType: MetricType;
    value: number;
    unit: string;
    methodologyId: string;
    createdAt: Date;
}

/**
 * Métriques groupées par asset
 */
export interface AssetMetrics {
    assetId: string;
    metrics: RseMetricEntity[];
    methodologyVersion: string;
    calculatedAt: Date;
}

/**
 * Résultat de calcul RSE pour un asset
 */
export interface RseCalculationResult {
    assetId: string;
    assetType: string;
    methodologyId: string;
    methodologyVersion: string;
    metrics: {
        type: MetricType;
        value: number;
        unit: string;
    }[];
    calculatedAt: Date;
}

// ============================================
// ERRORS
// ============================================

export class MetricsAlreadyExistError extends Error {
    constructor(public readonly assetId: string) {
        super(`RSE metrics already exist for asset ${assetId}. No recalculation allowed.`);
        this.name = 'MetricsAlreadyExistError';
    }
}

export class AssetNotFoundError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} not found`);
        this.name = 'AssetNotFoundError';
    }
}
