/**
 * Quality Analytics Service
 * Moteur analytique qualité pour détection des modèles/lots/fournisseurs à risque
 * 
 * RÈGLES STRICTES :
 * - Aucune auto-correction
 * - Aucune modification d'Asset sans validation humaine
 * - Les alertes sont informatives uniquement
 * - Le blocage préventif empêche les NOUVEAUX assets de passer SELLABLE
 */

import { PrismaClient, QualityAlertType } from '@prisma/client';
import { QualityMetricRepository } from '../repositories/qualityMetric.repository';
import {
    MetricKey,
    RmaRateResult,
    RMA_RATE_THRESHOLD,
    DEFAULT_ANALYSIS_PERIOD_DAYS
} from '../domain/qualityMetric.types';
import {
    QualityAlertEntity,
    QualitySummary,
    BlockingCheckResult
} from '../domain/qualityAlert.types';

// ============================================
// EVENTS
// ============================================

function emitQualityMetricCalculated(key: string, scope: string, value: number): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'QualityMetricCalculated',
        key,
        scope,
        value,
        timestamp: new Date().toISOString()
    }));
}

function emitQualityAlertRaised(alert: QualityAlertEntity): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'QualityAlertRaised',
        alertId: alert.id,
        alertType: alert.type,
        scope: alert.scope,
        reason: alert.reason,
        timestamp: new Date().toISOString()
    }));
}

function emitQualityAlertCleared(alertId: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'QualityAlertCleared',
        alertId,
        timestamp: new Date().toISOString()
    }));
}

// ============================================
// INTERFACES FOR EXTERNAL DATA
// ============================================

export interface RmaDataProvider {
    getRmaCountByModel(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>>;
    getRmaCountBySupplier(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>>;
}

export interface AssetDataProvider {
    getAssetModel(assetId: string): Promise<string | null>;
    getAssetSupplier(assetId: string): Promise<string | null>;
}

// ============================================
// HTTP RMA DATA PROVIDER (Production)
// ============================================

export class HttpRmaDataProvider implements RmaDataProvider {
    private readonly savUrl: string;
    private readonly assetUrl: string;

    constructor() {
        this.savUrl = process.env.SAV_SERVICE_URL || 'http://localhost:3006';
        this.assetUrl = process.env.ASSET_SERVICE_URL || 'http://localhost:3000';
    }

    async getRmaCountByModel(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>> {
        const result = new Map<string, { total: number; rmaCount: number }>();

        try {
            // Appel vers sav-service pour récupérer tous les RMA depuis fromDate
            const response = await fetch(
                `${this.savUrl}/sav/rma/by-period?from=${fromDate.toISOString()}`
            );

            if (!response.ok) {
                console.warn('[Quality] Failed to fetch RMA data from sav-service');
                return result;
            }

            const data = await response.json();
            const rmas = data.rmas || [];

            // Grouper par modèle en appelant asset-service pour chaque asset
            const modelCounts = new Map<string, { total: number; rmaCount: number }>();

            for (const rma of rmas) {
                try {
                    const assetResponse = await fetch(`${this.assetUrl}/assets/${rma.assetId}`);
                    if (assetResponse.ok) {
                        const asset = await assetResponse.json();
                        const model = asset.model || 'UNKNOWN';

                        if (!modelCounts.has(model)) {
                            modelCounts.set(model, { total: 0, rmaCount: 0 });
                        }
                        const counts = modelCounts.get(model)!;
                        counts.total += 1;
                        counts.rmaCount += 1;
                    }
                } catch (err) {
                    console.warn(`[Quality] Failed to fetch asset ${rma.assetId}`);
                }
            }

            return modelCounts;
        } catch (error) {
            console.warn('[Quality] RMA data provider error:', error);
            return result;
        }
    }

    async getRmaCountBySupplier(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>> {
        const result = new Map<string, { total: number; rmaCount: number }>();

        try {
            const response = await fetch(
                `${this.savUrl}/sav/rma/by-period?from=${fromDate.toISOString()}`
            );

            if (!response.ok) {
                return result;
            }

            const data = await response.json();
            const rmas = data.rmas || [];

            // Grouper par fournisseur (via procurement)
            const supplierCounts = new Map<string, { total: number; rmaCount: number }>();

            for (const rma of rmas) {
                // Simplifié : utiliser UNKNOWN si pas de fournisseur
                const supplier = 'UNKNOWN';
                if (!supplierCounts.has(supplier)) {
                    supplierCounts.set(supplier, { total: 0, rmaCount: 0 });
                }
                const counts = supplierCounts.get(supplier)!;
                counts.total += 1;
                counts.rmaCount += 1;
            }

            return supplierCounts;
        } catch (error) {
            console.warn('[Quality] RMA supplier data error:', error);
            return result;
        }
    }
}

// ============================================
// SERVICE
// ============================================

export class QualityAnalyticsService {
    private readonly repository: QualityMetricRepository;
    private readonly rmaProvider: RmaDataProvider;
    private readonly assetProvider: AssetDataProvider;

    constructor(
        prisma: PrismaClient,
        rmaProvider: RmaDataProvider,
        assetProvider: AssetDataProvider
    ) {
        this.repository = new QualityMetricRepository(prisma);
        this.rmaProvider = rmaProvider;
        this.assetProvider = assetProvider;
    }

    // ============================================
    // METRIC CALCULATION
    // ============================================

    /**
     * Calcule le taux de RMA par modèle
     * Règle : RMA_RATE = (nombre RMA / nombre total assets) * 100
     */
    async calculateRmaRatePerModel(days: number = DEFAULT_ANALYSIS_PERIOD_DAYS): Promise<RmaRateResult[]> {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const data = await this.rmaProvider.getRmaCountByModel(fromDate);
        const results: RmaRateResult[] = [];

        for (const [model, counts] of data.entries()) {
            if (counts.total === 0) continue;

            const rmaRate = (counts.rmaCount / counts.total) * 100;

            // Enregistrer la métrique
            await this.repository.saveMetric({
                key: MetricKey.RMA_RATE,
                value: rmaRate,
                scope: `model:${model}`
            });

            emitQualityMetricCalculated(MetricKey.RMA_RATE, `model:${model}`, rmaRate);

            results.push({
                scope: model,
                totalAssets: counts.total,
                rmaCount: counts.rmaCount,
                rmaRate
            });
        }

        return results;
    }

    /**
     * Calcule le taux de RMA par fournisseur
     */
    async calculateRmaRatePerSupplier(days: number = DEFAULT_ANALYSIS_PERIOD_DAYS): Promise<RmaRateResult[]> {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);

        const data = await this.rmaProvider.getRmaCountBySupplier(fromDate);
        const results: RmaRateResult[] = [];

        for (const [supplier, counts] of data.entries()) {
            if (counts.total === 0) continue;

            const rmaRate = (counts.rmaCount / counts.total) * 100;

            await this.repository.saveMetric({
                key: MetricKey.RMA_RATE,
                value: rmaRate,
                scope: `supplier:${supplier}`
            });

            emitQualityMetricCalculated(MetricKey.RMA_RATE, `supplier:${supplier}`, rmaRate);

            results.push({
                scope: supplier,
                totalAssets: counts.total,
                rmaCount: counts.rmaCount,
                rmaRate
            });
        }

        return results;
    }

    // ============================================
    // ALERT DETECTION
    // ============================================

    /**
     * Détecte les alertes basées sur les métriques calculées
     * Règle : Si RMA_RATE > 5% → créer alerte
     * 
     * IMPORTANT : Ne corrige RIEN automatiquement
     */
    async detectAlerts(): Promise<QualityAlertEntity[]> {
        const newAlerts: QualityAlertEntity[] = [];

        // Calculer les métriques
        const modelResults = await this.calculateRmaRatePerModel();
        const supplierResults = await this.calculateRmaRatePerSupplier();

        // Vérifier modèles
        for (const result of modelResults) {
            if (result.rmaRate > RMA_RATE_THRESHOLD) {
                const scope = `model:${result.scope}`;
                const hasAlert = await this.repository.hasActiveAlert(QualityAlertType.MODEL, scope);

                if (!hasAlert) {
                    const alert = await this.repository.createAlert({
                        type: QualityAlertType.MODEL,
                        scope,
                        reason: `RMA rate ${result.rmaRate.toFixed(2)}% exceeds threshold ${RMA_RATE_THRESHOLD}%`
                    });
                    emitQualityAlertRaised(alert);
                    newAlerts.push(alert);
                }
            }
        }

        // Vérifier fournisseurs
        for (const result of supplierResults) {
            if (result.rmaRate > RMA_RATE_THRESHOLD) {
                const scope = `supplier:${result.scope}`;
                const hasAlert = await this.repository.hasActiveAlert(QualityAlertType.SUPPLIER, scope);

                if (!hasAlert) {
                    const alert = await this.repository.createAlert({
                        type: QualityAlertType.SUPPLIER,
                        scope,
                        reason: `RMA rate ${result.rmaRate.toFixed(2)}% exceeds threshold ${RMA_RATE_THRESHOLD}%`
                    });
                    emitQualityAlertRaised(alert);
                    newAlerts.push(alert);
                }
            }
        }

        return newAlerts;
    }

    // ============================================
    // BLOCKING CHECK
    // ============================================

    /**
     * Vérifie si un asset est bloqué par une alerte active
     * 
     * RÈGLE STRICTE :
     * - Seuls les NOUVEAUX assets sont bloqués
     * - Les assets déjà SELLABLE restent vendables
     * - Pas de rappel automatique v1
     */
    async isAssetBlocked(assetId: string): Promise<BlockingCheckResult> {
        // Récupérer le modèle de l'asset
        const model = await this.assetProvider.getAssetModel(assetId);
        if (model) {
            const alert = await this.repository.getActiveAlertForScope(
                QualityAlertType.MODEL,
                `model:${model}`
            );
            if (alert) {
                return {
                    isBlocked: true,
                    reason: alert.reason,
                    alertId: alert.id
                };
            }
        }

        // Récupérer le fournisseur de l'asset
        const supplier = await this.assetProvider.getAssetSupplier(assetId);
        if (supplier) {
            const alert = await this.repository.getActiveAlertForScope(
                QualityAlertType.SUPPLIER,
                `supplier:${supplier}`
            );
            if (alert) {
                return {
                    isBlocked: true,
                    reason: alert.reason,
                    alertId: alert.id
                };
            }
        }

        return {
            isBlocked: false,
            reason: null,
            alertId: null
        };
    }

    // ============================================
    // SUMMARY
    // ============================================

    /**
     * Génère un résumé de la qualité pour l'API
     */
    async getSummary(): Promise<QualitySummary> {
        const activeAlerts = await this.repository.getActiveAlerts();
        const alertCounts = {
            model: activeAlerts.filter(a => a.type === QualityAlertType.MODEL).length,
            supplier: activeAlerts.filter(a => a.type === QualityAlertType.SUPPLIER).length,
            batch: activeAlerts.filter(a => a.type === QualityAlertType.BATCH).length
        };

        const periodStats = await this.repository.countAlertsInPeriod(7);

        return {
            activeAlerts,
            alertCounts,
            trends: {
                newAlertsLast7Days: periodStats.created,
                clearedAlertsLast7Days: periodStats.cleared
            }
        };
    }

    // ============================================
    // ALERT MANAGEMENT (MANUAL ONLY)
    // ============================================

    /**
     * Désactive une alerte manuellement
     * IMPORTANT : Seule action humaine autorisée
     */
    async clearAlert(alertId: string): Promise<QualityAlertEntity> {
        const alert = await this.repository.clearAlert(alertId);
        emitQualityAlertCleared(alertId);
        return alert;
    }

    /**
     * Récupère les alertes actives
     */
    async getActiveAlerts(): Promise<QualityAlertEntity[]> {
        return this.repository.getActiveAlerts();
    }
}
