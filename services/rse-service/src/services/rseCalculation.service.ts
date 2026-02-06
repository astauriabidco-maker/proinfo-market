/**
 * RSE Calculation Service
 * Calcul des métriques RSE par asset
 * 
 * RÈGLES STRICTES :
 * - Une métrique = un asset + un type + une méthode
 * - Jamais de recalcul rétroactif
 * - Chaque métrique liée à une méthodologie versionnée
 */

import { PrismaClient } from '@prisma/client';
import { AssetClient, AssetData } from '../integrations/asset.client';
import { RseMethodologyService } from './rseMethodology.service';
import {
    MetricType,
    METRIC_UNITS,
    RseMetricEntity,
    RseCalculationResult,
    MetricsAlreadyExistError,
    AssetNotFoundError
} from '../domain/rseMetric.types';
import { AssetCategory, CalculationFactors } from '../domain/rseMethodology.types';

export class RseCalculationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly methodologyService: RseMethodologyService,
        private readonly assetClient: AssetClient
    ) { }

    /**
     * Calculer les métriques RSE pour un asset
     * 
     * RÈGLE : Si métriques existent déjà → erreur (pas de recalcul)
     */
    async calculateForAsset(assetId: string): Promise<RseCalculationResult> {
        console.log(`[RSE] Calculating metrics for asset: ${assetId}`);

        // 1. Vérifier si métriques existent déjà
        const existing = await this.hasExistingMetrics(assetId);
        if (existing) {
            throw new MetricsAlreadyExistError(assetId);
        }

        // 2. Récupérer l'asset
        const asset = await this.assetClient.getAsset(assetId);
        if (!asset) {
            throw new AssetNotFoundError(assetId);
        }

        // 3. Récupérer la méthodologie active
        const methodology = await this.methodologyService.getActiveMethodology();

        // 4. Calculer les métriques
        const category = AssetClient.mapToCategory(asset.assetType);
        const weight = asset.weight || AssetClient.getEstimatedWeight(category);
        const metrics = this.computeMetrics(category, weight, methodology.factors);

        // 5. Persister les métriques (append-only)
        const now = new Date();
        const createdMetrics: RseMetricEntity[] = [];

        for (const metric of metrics) {
            const created = await this.prisma.rseMetric.create({
                data: {
                    assetId,
                    metricType: metric.type,
                    value: metric.value,
                    unit: metric.unit,
                    methodologyId: methodology.id
                }
            });

            createdMetrics.push({
                id: created.id,
                assetId: created.assetId,
                metricType: created.metricType as MetricType,
                value: created.value,
                unit: created.unit,
                methodologyId: created.methodologyId,
                createdAt: created.createdAt
            });
        }

        console.log(`[RSE] Metrics created for asset ${assetId}: ${createdMetrics.length}`);

        return {
            assetId,
            assetType: asset.assetType,
            methodologyId: methodology.id,
            methodologyVersion: methodology.version,
            metrics,
            calculatedAt: now
        };
    }

    /**
     * Vérifier si des métriques existent déjà pour un asset
     */
    async hasExistingMetrics(assetId: string): Promise<boolean> {
        const count = await this.prisma.rseMetric.count({
            where: { assetId }
        });
        return count > 0;
    }

    /**
     * Récupérer les métriques d'un asset
     */
    async getMetricsForAsset(assetId: string): Promise<RseMetricEntity[]> {
        const metrics = await this.prisma.rseMetric.findMany({
            where: { assetId },
            include: { methodology: true }
        });

        return metrics.map(m => ({
            id: m.id,
            assetId: m.assetId,
            metricType: m.metricType as MetricType,
            value: m.value,
            unit: m.unit,
            methodologyId: m.methodologyId,
            createdAt: m.createdAt
        }));
    }

    /**
     * Récupérer toutes les métriques pour une liste d'assets
     */
    async getMetricsForAssets(assetIds: string[]): Promise<RseMetricEntity[]> {
        const metrics = await this.prisma.rseMetric.findMany({
            where: { assetId: { in: assetIds } }
        });

        return metrics.map(m => ({
            id: m.id,
            assetId: m.assetId,
            metricType: m.metricType as MetricType,
            value: m.value,
            unit: m.unit,
            methodologyId: m.methodologyId,
            createdAt: m.createdAt
        }));
    }

    // ============================================
    // CALCULS
    // ============================================

    /**
     * Calculer les 3 métriques obligatoires
     */
    private computeMetrics(
        category: AssetCategory,
        weight: number,
        factors: CalculationFactors
    ): { type: MetricType; value: number; unit: string }[] {
        return [
            {
                type: 'CO2_AVOIDED',
                value: this.roundToTwoDecimals(factors.co2AvoidedPerKg[category]),
                unit: METRIC_UNITS.CO2_AVOIDED
            },
            {
                type: 'WATER_SAVED',
                value: this.roundToTwoDecimals(factors.waterSavedPerUnit[category]),
                unit: METRIC_UNITS.WATER_SAVED
            },
            {
                type: 'MATERIAL_SAVED',
                value: this.roundToTwoDecimals(weight * factors.materialSavedPerKg[category]),
                unit: METRIC_UNITS.MATERIAL_SAVED
            }
        ];
    }

    private roundToTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
