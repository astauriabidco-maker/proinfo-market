/**
 * KPI Calculation Service Tests
 * Tests unitaires pour le service de calcul des KPIs
 * 
 * RÈGLE : Ces tests vérifient le caractère DÉTERMINISTE des KPIs
 */

import { KpiPeriod, KpiFlag } from '@prisma/client';
import {
    KpiCalculationService,
    MockServiceDataProvider,
    ServiceDataProvider
} from '../services/kpiCalculation.service';
import { KPI_KEYS, KPI_THRESHOLDS } from '../domain/kpi.types';

// Mock du PrismaClient
const mockPrisma = {
    kpiSnapshot: {
        create: jest.fn(),
        findMany: jest.fn()
    }
} as any;

// Mock qui retourne des données dégradées
class DegradedDataProvider implements ServiceDataProvider {
    async getWmsStats() {
        return { avgTaskTime: 95, blockedTasks: 12, qaReworkRate: 25 }; // Critical values
    }
    async getStockStats() {
        return { available: 500, rotation: 1.5, blockedQuality: 30 };
    }
    async getQualityStats() {
        return { rmaRate: 12, avgResolution: 15, scrapRate: 6 };
    }
    async getCommercialStats() {
        return { b2bAvgBasket: 2000, quoteConversion: 20, quoteToOrderTime: 12 };
    }
    async getProcurementStats() {
        return { marginVariance: 25, lotRejectionRate: 45, riskySuppliers: 5 };
    }
}

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('KpiCalculationService', () => {
    let service: KpiCalculationService;
    let mockDataProvider: MockServiceDataProvider;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDataProvider = new MockServiceDataProvider();
        service = new KpiCalculationService(mockPrisma, mockDataProvider);
    });

    // ============================================
    // TEST 1 : should_calculate_daily_wms_kpis
    // ============================================

    test('should_calculate_daily_wms_kpis', async () => {
        // Arrange
        mockPrisma.kpiSnapshot.create.mockResolvedValue({ id: 'test-id' });

        // Act
        const result = await service.calculateAllKpis(KpiPeriod.DAILY);

        // Assert
        expect(result.period).toBe(KpiPeriod.DAILY);
        expect(result.kpis.length).toBeGreaterThanOrEqual(3); // Au moins 3 WMS KPIs

        // Vérifier les KPIs WMS
        const wmsKpis = result.kpis.filter(k => k.key.startsWith('WMS_'));
        expect(wmsKpis.length).toBe(3);

        const avgTaskTime = wmsKpis.find(k => k.key === KPI_KEYS.WMS_AVG_TASK_TIME);
        expect(avgTaskTime).toBeDefined();
        expect(avgTaskTime?.value).toBe(45); // Mock value
        expect(avgTaskTime?.flag).toBe(KpiFlag.OK); // 45 < 60 threshold

        // Vérifier snapshot créé
        expect(mockPrisma.kpiSnapshot.create).toHaveBeenCalled();
    });

    // ============================================
    // TEST 2 : should_snapshot_kpis_without_recalculation
    // ============================================

    test('should_snapshot_kpis_without_recalculation', async () => {
        // Arrange
        mockPrisma.kpiSnapshot.create.mockResolvedValue({ id: 'test-id' });

        // Act - Calculer deux fois
        await service.calculateAllKpis(KpiPeriod.DAILY);
        await service.calculateAllKpis(KpiPeriod.DAILY);

        // Assert - Deux séries de snapshots créés (pas de recalcul/merge)
        // 15 KPIs x 2 calculs = 30 appels create
        expect(mockPrisma.kpiSnapshot.create).toHaveBeenCalledTimes(30);

        // Chaque snapshot est créé indépendamment
        const calls = mockPrisma.kpiSnapshot.create.mock.calls;
        const keys = calls.map((c: any) => c[0].data.key);
        expect(keys.filter((k: string) => k === KPI_KEYS.WMS_AVG_TASK_TIME).length).toBe(2);
    });

    // ============================================
    // TEST 3 : should_flag_degraded_kpi
    // ============================================

    test('should_flag_degraded_kpi', async () => {
        // Arrange - Provider avec valeurs dégradées
        const degradedService = new KpiCalculationService(mockPrisma, new DegradedDataProvider());
        mockPrisma.kpiSnapshot.create.mockResolvedValue({ id: 'test-id' });

        // Act
        const result = await degradedService.calculateAllKpis(KpiPeriod.DAILY);

        // Assert - Vérifier les flags
        const avgTaskTime = result.kpis.find(k => k.key === KPI_KEYS.WMS_AVG_TASK_TIME);
        expect(avgTaskTime?.flag).toBe(KpiFlag.CRITICAL); // 95 > 90 (critical threshold)

        const blockedTasks = result.kpis.find(k => k.key === KPI_KEYS.WMS_BLOCKED_TASKS);
        expect(blockedTasks?.flag).toBe(KpiFlag.CRITICAL); // 12 > 10

        // Vérifier flags collectés
        expect(result.flags.length).toBeGreaterThan(0);

        // Vérifier événement KpiFlagRaised émis
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('KpiFlagRaised')
        );
    });

    // ============================================
    // TEST 4 : should_not_modify_source_data
    // ============================================

    test('should_not_modify_source_data', async () => {
        // Arrange
        mockPrisma.kpiSnapshot.create.mockResolvedValue({ id: 'test-id' });

        // Act
        await service.calculateAllKpis(KpiPeriod.DAILY);

        // Assert - Aucune mutation des sources
        // Le mock data provider n'a pas de méthodes de modification
        // Vérifier qu'aucun update/delete n'a été appelé
        expect(mockPrisma.kpiSnapshot.create).toHaveBeenCalled();

        // Vérifier CREATE uniquement (pas d'update)
        const calls = mockPrisma.kpiSnapshot.create.mock.calls;
        expect(calls.length).toBe(15); // 15 KPIs créés

        // Aucune autre méthode Prisma appelée
        expect(mockPrisma.kpiSnapshot.findMany).not.toHaveBeenCalled();
    });

    // ============================================
    // TEST 5 : should_expose_kpis_via_api
    // ============================================

    test('should_expose_kpis_via_api', async () => {
        // Arrange - Mock getLatestKpis
        const mockKpis = [
            { id: '1', key: 'WMS_AVG_TASK_TIME', value: 45, period: KpiPeriod.DAILY, flag: KpiFlag.OK },
            { id: '2', key: 'WMS_BLOCKED_TASKS', value: 3, period: KpiPeriod.DAILY, flag: KpiFlag.OK }
        ];
        mockPrisma.kpiSnapshot.findMany.mockResolvedValue(mockKpis);

        // Act
        const result = await service.getLatestKpis(KpiPeriod.DAILY);

        // Assert
        expect(result).toEqual(mockKpis);
        expect(mockPrisma.kpiSnapshot.findMany).toHaveBeenCalledWith({
            where: { period: KpiPeriod.DAILY },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
    });
});
