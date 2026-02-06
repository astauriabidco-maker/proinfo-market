/**
 * KPI Calculation Service
 * Service de calcul des KPIs opérationnels
 * 
 * RÈGLES STRICTES :
 * - Lecture seule des services sources
 * - Snapshots figés (pas de recalcul rétroactif)
 * - KPIs déterministes et traçables
 */

import { PrismaClient, KpiPeriod, KpiFlag } from '@prisma/client';
import axios from 'axios';
import {
    KPI_KEYS,
    KPI_THRESHOLDS,
    CalculatedKpi,
    KpiCalculationResult,
    emitKpiCalculated,
    emitKpiFlagRaised
} from '../domain/kpi.types';

// ============================================
// SERVICE CLIENTS (lecture seule)
// ============================================

export interface ServiceDataProvider {
    getWmsStats(): Promise<WmsStats>;
    getStockStats(): Promise<StockStats>;
    getQualityStats(): Promise<QualityStats>;
    getCommercialStats(): Promise<CommercialStats>;
    getProcurementStats(): Promise<ProcurementStats>;
}

interface WmsStats {
    avgTaskTime: number;
    blockedTasks: number;
    qaReworkRate: number;
}

interface StockStats {
    available: number;
    rotation: number;
    blockedQuality: number;
}

interface QualityStats {
    rmaRate: number;
    avgResolution: number;
    scrapRate: number;
}

interface CommercialStats {
    b2bAvgBasket: number;
    quoteConversion: number;
    quoteToOrderTime: number;
}

interface ProcurementStats {
    marginVariance: number;
    lotRejectionRate: number;
    riskySuppliers: number;
}

// ============================================
// MOCK DATA PROVIDER
// ============================================

export class MockServiceDataProvider implements ServiceDataProvider {
    async getWmsStats(): Promise<WmsStats> {
        return { avgTaskTime: 45, blockedTasks: 3, qaReworkRate: 8 };
    }

    async getStockStats(): Promise<StockStats> {
        return { available: 1250, rotation: 2.5, blockedQuality: 15 };
    }

    async getQualityStats(): Promise<QualityStats> {
        return { rmaRate: 4.2, avgResolution: 5, scrapRate: 1.5 };
    }

    async getCommercialStats(): Promise<CommercialStats> {
        return { b2bAvgBasket: 3500, quoteConversion: 35, quoteToOrderTime: 4 };
    }

    async getProcurementStats(): Promise<ProcurementStats> {
        return { marginVariance: 8, lotRejectionRate: 15, riskySuppliers: 2 };
    }
}

// ============================================
// REAL DATA PROVIDER (Production)
// ============================================

export class RealServiceDataProvider implements ServiceDataProvider {
    private readonly wmsUrl: string;
    private readonly inventoryUrl: string;
    private readonly qualityUrl: string;
    private readonly savUrl: string;
    private readonly ecommerceUrl: string;
    private readonly procurementUrl: string;

    constructor() {
        this.wmsUrl = process.env.WMS_SERVICE_URL || 'http://localhost:3004';
        this.inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
        this.qualityUrl = process.env.QUALITY_SERVICE_URL || 'http://localhost:3005';
        this.savUrl = process.env.SAV_SERVICE_URL || 'http://localhost:3006';
        this.ecommerceUrl = process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:3007';
        this.procurementUrl = process.env.PROCUREMENT_SERVICE_URL || 'http://localhost:3001';
    }

    async getWmsStats(): Promise<WmsStats> {
        try {
            // Appel vers wms-service pour récupérer les stats
            const tasksResponse = await axios.get(`${this.wmsUrl}/wms/tasks/stats`);
            const stats = tasksResponse.data;

            return {
                avgTaskTime: stats.avgTaskTime || 0,
                blockedTasks: stats.blockedTasks || 0,
                qaReworkRate: stats.qaReworkRate || 0
            };
        } catch (error) {
            console.warn('[KPI] WMS stats unavailable, using fallback');
            // Fallback si le service ne répond pas
            return { avgTaskTime: 0, blockedTasks: 0, qaReworkRate: 0 };
        }
    }

    async getStockStats(): Promise<StockStats> {
        try {
            // Appel vers inventory-service pour récupérer les stats stock
            const stockResponse = await axios.get(`${this.inventoryUrl}/inventory/stats`);
            const stats = stockResponse.data;

            return {
                available: stats.available || 0,
                rotation: stats.rotation || 0,
                blockedQuality: stats.blockedQuality || 0
            };
        } catch (error) {
            console.warn('[KPI] Inventory stats unavailable, using fallback');
            return { available: 0, rotation: 0, blockedQuality: 0 };
        }
    }

    async getQualityStats(): Promise<QualityStats> {
        try {
            // Appel vers quality-service et sav-service
            const qualityResponse = await axios.get(`${this.qualityUrl}/quality/analytics/summary`);
            const savResponse = await axios.get(`${this.savUrl}/sav/stats`);

            const qualityStats = qualityResponse.data;
            const savStats = savResponse.data;

            // Calculer taux RMA depuis les alertes qualité
            const totalAlerts = qualityStats.activeAlerts?.length || 0;
            const rmaRate = totalAlerts > 0 ? (totalAlerts / 100) * 100 : 0;

            return {
                rmaRate: savStats.rmaRate || rmaRate || 0,
                avgResolution: savStats.avgResolutionDays || 0,
                scrapRate: savStats.scrapRate || 0
            };
        } catch (error) {
            console.warn('[KPI] Quality/SAV stats unavailable, using fallback');
            return { rmaRate: 0, avgResolution: 0, scrapRate: 0 };
        }
    }

    async getCommercialStats(): Promise<CommercialStats> {
        try {
            // Appel vers ecommerce-service pour stats commerciales
            const response = await axios.get(`${this.ecommerceUrl}/b2b/stats`);
            const stats = response.data;

            return {
                b2bAvgBasket: stats.avgBasket || 0,
                quoteConversion: stats.quoteConversionRate || 0,
                quoteToOrderTime: stats.avgQuoteToOrderDays || 0
            };
        } catch (error) {
            console.warn('[KPI] Commercial stats unavailable, using fallback');
            return { b2bAvgBasket: 0, quoteConversion: 0, quoteToOrderTime: 0 };
        }
    }

    async getProcurementStats(): Promise<ProcurementStats> {
        try {
            // Appel vers procurement-service pour stats achats
            const response = await axios.get(`${this.procurementUrl}/procurement/stats`);
            const stats = response.data;

            return {
                marginVariance: stats.marginVariance || 0,
                lotRejectionRate: stats.rejectionRate || 0,
                riskySuppliers: stats.riskySupplierCount || 0
            };
        } catch (error) {
            console.warn('[KPI] Procurement stats unavailable, using fallback');
            return { marginVariance: 0, lotRejectionRate: 0, riskySuppliers: 0 };
        }
    }
}

// ============================================
// SERVICE
// ============================================

export class KpiCalculationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly dataProvider: ServiceDataProvider
    ) { }

    // ============================================
    // MAIN CALCULATION
    // ============================================

    /**
     * Calcule tous les KPIs pour une période
     * 
     * RÈGLE : Crée des snapshots figés, pas de recalcul
     */
    async calculateAllKpis(period: KpiPeriod = KpiPeriod.DAILY): Promise<KpiCalculationResult> {
        const kpis: CalculatedKpi[] = [];
        const flags: { key: string; flag: KpiFlag; reason: string }[] = [];

        // 1. Calculer WMS KPIs
        const wmsKpis = await this.calculateWmsKpis();
        kpis.push(...wmsKpis);

        // 2. Calculer Stock KPIs
        const stockKpis = await this.calculateStockKpis();
        kpis.push(...stockKpis);

        // 3. Calculer Qualité/SAV KPIs
        const qualityKpis = await this.calculateQualityKpis();
        kpis.push(...qualityKpis);

        // 4. Calculer Commercial KPIs
        const commercialKpis = await this.calculateCommercialKpis();
        kpis.push(...commercialKpis);

        // 5. Calculer Procurement KPIs
        const procurementKpis = await this.calculateProcurementKpis();
        kpis.push(...procurementKpis);

        // 6. Sauvegarder snapshots
        await this.saveSnapshots(kpis, period);

        // 7. Collecter les flags
        for (const kpi of kpis) {
            if (kpi.flag !== KpiFlag.OK) {
                const reason = this.getFlagReason(kpi.key, kpi.value, kpi.flag);
                flags.push({ key: kpi.key, flag: kpi.flag, reason });
                emitKpiFlagRaised(kpi.key, kpi.flag, reason);
            }
            emitKpiCalculated(kpi.key, kpi.value);
        }

        return {
            period,
            calculatedAt: new Date(),
            kpis,
            flags
        };
    }

    // ============================================
    // WMS KPIs
    // ============================================

    private async calculateWmsKpis(): Promise<CalculatedKpi[]> {
        const stats = await this.dataProvider.getWmsStats();

        return [
            {
                key: KPI_KEYS.WMS_AVG_TASK_TIME,
                value: stats.avgTaskTime,
                flag: this.evaluateFlag(KPI_KEYS.WMS_AVG_TASK_TIME, stats.avgTaskTime)
            },
            {
                key: KPI_KEYS.WMS_BLOCKED_TASKS,
                value: stats.blockedTasks,
                flag: this.evaluateFlag(KPI_KEYS.WMS_BLOCKED_TASKS, stats.blockedTasks)
            },
            {
                key: KPI_KEYS.WMS_QA_REWORK_RATE,
                value: stats.qaReworkRate,
                flag: this.evaluateFlag(KPI_KEYS.WMS_QA_REWORK_RATE, stats.qaReworkRate)
            }
        ];
    }

    // ============================================
    // Stock KPIs
    // ============================================

    private async calculateStockKpis(): Promise<CalculatedKpi[]> {
        const stats = await this.dataProvider.getStockStats();

        return [
            {
                key: KPI_KEYS.STOCK_AVAILABLE,
                value: stats.available,
                flag: KpiFlag.OK
            },
            {
                key: KPI_KEYS.STOCK_ROTATION,
                value: stats.rotation,
                flag: KpiFlag.OK
            },
            {
                key: KPI_KEYS.STOCK_BLOCKED_QUALITY,
                value: stats.blockedQuality,
                flag: this.evaluateFlag(KPI_KEYS.STOCK_BLOCKED_QUALITY, stats.blockedQuality)
            }
        ];
    }

    // ============================================
    // Quality/SAV KPIs
    // ============================================

    private async calculateQualityKpis(): Promise<CalculatedKpi[]> {
        const stats = await this.dataProvider.getQualityStats();

        return [
            {
                key: KPI_KEYS.RMA_RATE,
                value: stats.rmaRate,
                flag: this.evaluateFlag(KPI_KEYS.RMA_RATE, stats.rmaRate)
            },
            {
                key: KPI_KEYS.SAV_AVG_RESOLUTION,
                value: stats.avgResolution,
                flag: this.evaluateFlag(KPI_KEYS.SAV_AVG_RESOLUTION, stats.avgResolution)
            },
            {
                key: KPI_KEYS.SCRAP_RATE,
                value: stats.scrapRate,
                flag: this.evaluateFlag(KPI_KEYS.SCRAP_RATE, stats.scrapRate)
            }
        ];
    }

    // ============================================
    // Commercial KPIs
    // ============================================

    private async calculateCommercialKpis(): Promise<CalculatedKpi[]> {
        const stats = await this.dataProvider.getCommercialStats();

        return [
            {
                key: KPI_KEYS.B2B_AVG_BASKET,
                value: stats.b2bAvgBasket,
                flag: KpiFlag.OK
            },
            {
                key: KPI_KEYS.QUOTE_CONVERSION,
                value: stats.quoteConversion,
                flag: this.evaluateFlag(KPI_KEYS.QUOTE_CONVERSION, stats.quoteConversion)
            },
            {
                key: KPI_KEYS.QUOTE_TO_ORDER_TIME,
                value: stats.quoteToOrderTime,
                flag: this.evaluateFlag(KPI_KEYS.QUOTE_TO_ORDER_TIME, stats.quoteToOrderTime)
            }
        ];
    }

    // ============================================
    // Procurement KPIs
    // ============================================

    private async calculateProcurementKpis(): Promise<CalculatedKpi[]> {
        const stats = await this.dataProvider.getProcurementStats();

        return [
            {
                key: KPI_KEYS.MARGIN_VARIANCE,
                value: stats.marginVariance,
                flag: this.evaluateFlag(KPI_KEYS.MARGIN_VARIANCE, stats.marginVariance)
            },
            {
                key: KPI_KEYS.LOT_REJECTION_RATE,
                value: stats.lotRejectionRate,
                flag: this.evaluateFlag(KPI_KEYS.LOT_REJECTION_RATE, stats.lotRejectionRate)
            },
            {
                key: KPI_KEYS.RISKY_SUPPLIERS,
                value: stats.riskySuppliers,
                flag: KpiFlag.OK
            }
        ];
    }

    // ============================================
    // FLAG EVALUATION
    // ============================================

    private evaluateFlag(key: string, value: number): KpiFlag {
        const threshold = KPI_THRESHOLDS[key];
        if (!threshold) return KpiFlag.OK;

        if (threshold.direction === 'higher_is_bad') {
            if (threshold.critical && value >= threshold.critical) return KpiFlag.CRITICAL;
            if (value >= threshold.warning) return KpiFlag.WARNING;
        } else {
            if (threshold.critical && value <= threshold.critical) return KpiFlag.CRITICAL;
            if (value <= threshold.warning) return KpiFlag.WARNING;
        }

        return KpiFlag.OK;
    }

    private getFlagReason(key: string, value: number, flag: KpiFlag): string {
        const threshold = KPI_THRESHOLDS[key];
        if (!threshold) return 'Unknown threshold';

        const thresholdValue = flag === KpiFlag.CRITICAL ? threshold.critical : threshold.warning;
        const comparison = threshold.direction === 'higher_is_bad' ? 'exceeds' : 'below';
        return `${key} ${value} ${comparison} threshold ${thresholdValue}`;
    }

    // ============================================
    // PERSISTENCE
    // ============================================

    private async saveSnapshots(kpis: CalculatedKpi[], period: KpiPeriod): Promise<void> {
        for (const kpi of kpis) {
            await this.prisma.kpiSnapshot.create({
                data: {
                    key: kpi.key,
                    value: kpi.value,
                    period,
                    flag: kpi.flag,
                    metadata: kpi.metadata ? JSON.parse(JSON.stringify(kpi.metadata)) : undefined
                }
            });
        }
    }

    // ============================================
    // QUERY
    // ============================================

    async getLatestKpis(period?: KpiPeriod): Promise<any[]> {
        const where = period ? { period } : {};

        // Récupérer les derniers snapshots pour chaque clé
        const snapshots = await this.prisma.kpiSnapshot.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return snapshots;
    }

    async getKpiHistory(key: string, days: number = 7): Promise<any[]> {
        const since = new Date();
        since.setDate(since.getDate() - days);

        return this.prisma.kpiSnapshot.findMany({
            where: {
                key,
                createdAt: { gte: since }
            },
            orderBy: { createdAt: 'asc' }
        });
    }
}
