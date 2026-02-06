/**
 * RSE Report Types
 * Types pour les rapports et exports RSE
 * 
 * RÈGLE : Export audit-ready, sources traçables
 */

import { MetricType, RseMetricEntity } from './rseMetric.types';

/**
 * Formats d'export supportés
 */
export type ExportFormat = 'PDF' | 'CSV' | 'JSON';

/**
 * Filtres pour rapport client
 */
export interface ReportFilters {
    customerRef?: string;
    period?: string;      // "2026" ou "2026-Q1"
    startDate?: Date;
    endDate?: Date;
}

/**
 * Métriques agrégées
 */
export interface AggregatedMetrics {
    co2Avoided: number;
    waterSaved: number;
    materialSaved: number;
    assetCount: number;
}

/**
 * Rapport client complet
 */
export interface CustomerReport {
    /** Référence client */
    customerRef: string;

    /** Période couverte */
    period: string;

    /** Métriques agrégées */
    totals: AggregatedMetrics;

    /** Moyennes par équipement */
    averages: {
        co2PerAsset: number;
        waterPerAsset: number;
        materialPerAsset: number;
    };

    /** Détail par asset */
    assets: AssetReportLine[];

    /** Référence méthodologique */
    methodology: {
        version: string;
        sources: string;
    };

    /** Métadonnées du rapport */
    generatedAt: Date;
}

/**
 * Ligne de détail par asset
 */
export interface AssetReportLine {
    assetId: string;
    serialNumber: string;
    assetType: string;
    metrics: {
        type: MetricType;
        value: number;
        unit: string;
    }[];
    calculatedAt: Date;
}

/**
 * Résultat d'export
 */
export interface ExportResult {
    format: ExportFormat;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    generatedAt: Date;
}

/**
 * Options d'export
 */
export interface ExportOptions {
    format: ExportFormat;
    includeMethodology?: boolean;
    language?: 'fr' | 'en';
}
