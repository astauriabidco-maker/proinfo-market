/**
 * RSE Calculation Service Tests
 * Tests Sprint 24 — RSE & Conformité Entreprise
 * 
 * TESTS OBLIGATOIRES (5) — NOMS EXACTS
 */

import { RseMethodologyService } from '../services/rseMethodology.service';
import { RseCalculationService } from '../services/rseCalculation.service';
import { RseReportService } from '../services/rseReport.service';
import { AssetClient } from '../integrations/asset.client';
import {
    DEFAULT_ADEME_FACTORS,
    NoActiveMethodologyError
} from '../domain/rseMethodology.types';
import { MetricsAlreadyExistError } from '../domain/rseMetric.types';

// ============================================
// MOCKS
// ============================================

const createMockPrisma = () => ({
    rseMethodology: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
    },
    rseMetric: {
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn()
    }
});

const createMockAssetClient = () => ({
    getAsset: jest.fn(),
    getAssetsByCustomer: jest.fn()
});

// ============================================
// TEST DATA
// ============================================

const mockMethodology = {
    id: 'method-2026-Q1',
    version: '2026-Q1-ADEME',
    description: 'Méthodologie basée sur les données ADEME 2024',
    sources: 'ADEME Base Carbone 2024, EPEAT Registry',
    factors: DEFAULT_ADEME_FACTORS,
    createdAt: new Date('2026-01-01')
};

const mockAsset = {
    id: 'asset-001',
    serialNumber: 'SN-LAPTOP-001',
    assetType: 'LAPTOP',
    brand: 'Dell',
    model: 'Latitude 5520',
    weight: 2.5,
    status: 'SELLABLE',
    createdAt: new Date()
};

const mockMetric = {
    id: 'metric-001',
    assetId: 'asset-001',
    metricType: 'CO2_AVOIDED',
    value: 156,
    unit: 'kg',
    methodologyId: 'method-2026-Q1',
    createdAt: new Date()
};

// ============================================
// TESTS
// ============================================

describe('RSE Calculation Service - Sprint 24', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let assetClient: ReturnType<typeof createMockAssetClient>;
    let methodologyService: RseMethodologyService;
    let calculationService: RseCalculationService;
    let reportService: RseReportService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        assetClient = createMockAssetClient();
        methodologyService = new RseMethodologyService(prisma as any);
        calculationService = new RseCalculationService(
            prisma as any,
            methodologyService,
            assetClient as any
        );
        reportService = new RseReportService(
            prisma as any,
            calculationService,
            methodologyService,
            assetClient as any
        );
    });

    // ========== TEST 1 ==========
    describe('should_calculate_rse_metrics_per_asset', () => {
        it('calculates CO2, water, and material metrics for an asset', async () => {
            // Arrange
            prisma.rseMetric.count.mockResolvedValue(0);
            prisma.rseMethodology.findFirst.mockResolvedValue(mockMethodology);
            prisma.rseMetric.create.mockImplementation(async ({ data }) => ({
                id: `metric-${data.metricType}`,
                ...data,
                createdAt: new Date()
            }));
            assetClient.getAsset.mockResolvedValue(mockAsset);

            // Act
            const result = await calculationService.calculateForAsset('asset-001');

            // Assert — 3 métriques obligatoires
            expect(result.assetId).toBe('asset-001');
            expect(result.metrics).toHaveLength(3);

            const metricTypes = result.metrics.map(m => m.type);
            expect(metricTypes).toContain('CO2_AVOIDED');
            expect(metricTypes).toContain('WATER_SAVED');
            expect(metricTypes).toContain('MATERIAL_SAVED');

            // Vérifier les valeurs (basées sur ADEME pour LAPTOP)
            const co2 = result.metrics.find(m => m.type === 'CO2_AVOIDED');
            expect(co2?.value).toBe(156);  // kg CO2 évités pour laptop
            expect(co2?.unit).toBe('kg');
        });
    });

    // ========== TEST 2 ==========
    describe('should_link_metrics_to_methodology_version', () => {
        it('links each metric to the active methodology version', async () => {
            // Arrange
            prisma.rseMetric.count.mockResolvedValue(0);
            prisma.rseMethodology.findFirst.mockResolvedValue(mockMethodology);
            prisma.rseMetric.create.mockImplementation(async ({ data }) => ({
                id: `metric-${data.metricType}`,
                ...data,
                createdAt: new Date()
            }));
            assetClient.getAsset.mockResolvedValue(mockAsset);

            // Act
            const result = await calculationService.calculateForAsset('asset-001');

            // Assert — Traçabilité méthodologique
            expect(result.methodologyId).toBe('method-2026-Q1');
            expect(result.methodologyVersion).toBe('2026-Q1-ADEME');

            // Vérifier que chaque metric.create reçoit methodologyId
            expect(prisma.rseMetric.create).toHaveBeenCalledTimes(3);
            const calls = prisma.rseMetric.create.mock.calls;
            for (const call of calls) {
                expect(call[0].data.methodologyId).toBe('method-2026-Q1');
            }
        });
    });

    // ========== TEST 3 ==========
    describe('should_aggregate_metrics_per_customer', () => {
        it('aggregates metrics for a customer across multiple assets', async () => {
            // Arrange
            const customerAssets = [
                { assetId: 'asset-001', orderId: 'order-1', customerRef: 'ACME-001', soldAt: new Date() },
                { assetId: 'asset-002', orderId: 'order-1', customerRef: 'ACME-001', soldAt: new Date() }
            ];

            const allMetrics = [
                { id: 'm1', assetId: 'asset-001', metricType: 'CO2_AVOIDED', value: 156, unit: 'kg', methodologyId: 'method-1', createdAt: new Date() },
                { id: 'm2', assetId: 'asset-001', metricType: 'WATER_SAVED', value: 190000, unit: 'L', methodologyId: 'method-1', createdAt: new Date() },
                { id: 'm3', assetId: 'asset-001', metricType: 'MATERIAL_SAVED', value: 2.125, unit: 'kg', methodologyId: 'method-1', createdAt: new Date() },
                { id: 'm4', assetId: 'asset-002', metricType: 'CO2_AVOIDED', value: 156, unit: 'kg', methodologyId: 'method-1', createdAt: new Date() },
                { id: 'm5', assetId: 'asset-002', metricType: 'WATER_SAVED', value: 190000, unit: 'L', methodologyId: 'method-1', createdAt: new Date() },
                { id: 'm6', assetId: 'asset-002', metricType: 'MATERIAL_SAVED', value: 2.125, unit: 'kg', methodologyId: 'method-1', createdAt: new Date() }
            ];

            assetClient.getAssetsByCustomer.mockResolvedValue(customerAssets);
            prisma.rseMetric.findMany.mockResolvedValue(allMetrics);
            prisma.rseMethodology.findFirst.mockResolvedValue(mockMethodology);
            assetClient.getAsset.mockResolvedValue(mockAsset);

            // Act
            const report = await reportService.getCustomerReport({ customerRef: 'ACME-001', period: '2026' });

            // Assert — Agrégation correcte
            expect(report.customerRef).toBe('ACME-001');
            expect(report.totals.co2Avoided).toBe(312);     // 156 * 2
            expect(report.totals.waterSaved).toBe(380000);  // 190000 * 2
            expect(report.totals.assetCount).toBe(2);

            // Moyennes
            expect(report.averages.co2PerAsset).toBe(156);
            expect(report.averages.waterPerAsset).toBe(190000);
        });
    });

    // ========== TEST 4 ==========
    describe('should_export_compliance_report', () => {
        it('exports a compliance report with methodology reference', async () => {
            // Arrange
            const mockReport = {
                customerRef: 'ACME-001',
                period: '2026',
                totals: { co2Avoided: 312, waterSaved: 380000, materialSaved: 4.25, assetCount: 2 },
                averages: { co2PerAsset: 156, waterPerAsset: 190000, materialPerAsset: 2.125 },
                assets: [],
                methodology: { version: '2026-Q1-ADEME', sources: 'ADEME Base Carbone 2024' },
                generatedAt: new Date()
            };

            // Act — Export JSON
            const result = await reportService.exportReport(mockReport, { format: 'JSON' });

            // Assert
            expect(result.format).toBe('JSON');
            expect(result.mimeType).toBe('application/json');
            expect(result.filename).toContain('ACME-001');
            expect(result.buffer.length).toBeGreaterThan(0);

            // Vérifier que la méthodologie est incluse
            const parsed = JSON.parse(result.buffer.toString());
            expect(parsed.methodology.version).toBe('2026-Q1-ADEME');
            expect(parsed.methodology.sources).toContain('ADEME');
        });
    });

    // ========== TEST 5 ==========
    describe('should_not_recalculate_existing_metrics', () => {
        it('throws error when trying to recalculate existing metrics', async () => {
            // Arrange — Métriques existent déjà
            prisma.rseMetric.count.mockResolvedValue(3);

            // Act & Assert
            await expect(
                calculationService.calculateForAsset('asset-001')
            ).rejects.toThrow(MetricsAlreadyExistError);

            await expect(
                calculationService.calculateForAsset('asset-001')
            ).rejects.toThrow('RSE metrics already exist for asset asset-001. No recalculation allowed.');

            // Vérifier qu'aucune création n'a eu lieu
            expect(prisma.rseMetric.create).not.toHaveBeenCalled();
        });
    });
});
