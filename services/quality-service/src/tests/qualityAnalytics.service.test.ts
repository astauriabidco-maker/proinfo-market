/**
 * Quality Analytics Service Tests
 * Tests unitaires pour le service analytique qualité
 * 
 * RÈGLE : Ces tests vérifient que le système ne corrige JAMAIS automatiquement
 */

import { QualityAnalyticsService, RmaDataProvider, AssetDataProvider } from '../analytics/qualityAnalytics.service';
import { QualityAlertType } from '@prisma/client';
import { RMA_RATE_THRESHOLD } from '../domain/qualityMetric.types';

// Mock du PrismaClient
const mockPrisma = {
    qualityMetric: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn()
    },
    qualityAlert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    }
} as any;

// Mock des providers
const mockRmaProvider: RmaDataProvider = {
    getRmaCountByModel: jest.fn(),
    getRmaCountBySupplier: jest.fn()
};

const mockAssetProvider: AssetDataProvider = {
    getAssetModel: jest.fn(),
    getAssetSupplier: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('QualityAnalyticsService', () => {
    let service: QualityAnalyticsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new QualityAnalyticsService(mockPrisma, mockRmaProvider, mockAssetProvider);
    });

    // ============================================
    // TEST 1 : Calcul du taux RMA par modèle
    // ============================================

    test('should_calculate_rma_rate_per_model', async () => {
        // Arrange - Données de test avec différents taux RMA
        const mockModelData = new Map<string, { total: number; rmaCount: number }>([
            ['Dell XPS 15', { total: 100, rmaCount: 3 }],   // 3%
            ['HP ProBook', { total: 50, rmaCount: 4 }]      // 8%
        ]);
        (mockRmaProvider.getRmaCountByModel as jest.Mock).mockResolvedValue(mockModelData);
        (mockRmaProvider.getRmaCountBySupplier as jest.Mock).mockResolvedValue(new Map());
        mockPrisma.qualityMetric.create.mockImplementation((data: any) => Promise.resolve({
            id: 'metric-1',
            ...data.data,
            createdAt: new Date()
        }));
        mockPrisma.qualityAlert.count.mockResolvedValue(0);

        // Act
        const results = await service.calculateRmaRatePerModel();

        // Assert
        expect(results).toHaveLength(2);

        const dellResult = results.find(r => r.scope === 'Dell XPS 15');
        expect(dellResult).toBeDefined();
        expect(dellResult!.rmaRate).toBe(3);
        expect(dellResult!.totalAssets).toBe(100);
        expect(dellResult!.rmaCount).toBe(3);

        const hpResult = results.find(r => r.scope === 'HP ProBook');
        expect(hpResult).toBeDefined();
        expect(hpResult!.rmaRate).toBe(8);

        // Vérifier que les métriques ont été sauvegardées
        expect(mockPrisma.qualityMetric.create).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('QualityMetricCalculated')
        );
    });

    // ============================================
    // TEST 2 : Création d'alerte si seuil dépassé
    // ============================================

    test('should_raise_alert_when_threshold_exceeded', async () => {
        // Arrange - Un modèle dépasse le seuil de 5%
        const mockModelData = new Map<string, { total: number; rmaCount: number }>([
            ['Model OK', { total: 100, rmaCount: 2 }],     // 2% < 5% = OK
            ['Model BAD', { total: 100, rmaCount: 8 }]     // 8% > 5% = ALERTE
        ]);
        (mockRmaProvider.getRmaCountByModel as jest.Mock).mockResolvedValue(mockModelData);
        (mockRmaProvider.getRmaCountBySupplier as jest.Mock).mockResolvedValue(new Map());

        mockPrisma.qualityMetric.create.mockImplementation((data: any) => Promise.resolve({
            id: 'metric-1',
            ...data.data,
            createdAt: new Date()
        }));

        // Pas d'alerte existante
        mockPrisma.qualityAlert.count.mockResolvedValue(0);

        mockPrisma.qualityAlert.create.mockImplementation((data: any) => Promise.resolve({
            id: 'alert-1',
            ...data.data,
            createdAt: new Date()
        }));

        // Act
        const newAlerts = await service.detectAlerts();

        // Assert
        expect(newAlerts).toHaveLength(1);
        const firstAlert = newAlerts[0]!;
        expect(firstAlert.type).toBe(QualityAlertType.MODEL);
        expect(firstAlert.scope).toBe('model:Model BAD');
        expect(firstAlert.reason).toContain('8.00%');
        expect(firstAlert.reason).toContain(`exceeds threshold ${RMA_RATE_THRESHOLD}%`);

        // Vérifier l'événement
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('QualityAlertRaised')
        );
    });

    // ============================================
    // TEST 3 : PAS de correction automatique
    // ============================================

    test('should_not_auto_fix_quality_issue', async () => {
        // Ce test vérifie que le service NE MODIFIE JAMAIS un Asset
        // Il n'y a pas de méthode pour modifier un Asset dans QualityAnalyticsService

        // Arrange
        const mockModelData = new Map<string, { total: number; rmaCount: number }>([
            ['Problematic Model', { total: 100, rmaCount: 15 }]  // 15% = très mauvais
        ]);
        (mockRmaProvider.getRmaCountByModel as jest.Mock).mockResolvedValue(mockModelData);
        (mockRmaProvider.getRmaCountBySupplier as jest.Mock).mockResolvedValue(new Map());

        mockPrisma.qualityMetric.create.mockResolvedValue({ id: 'metric-1', key: 'RMA_RATE', value: 15, scope: 'model:Problematic Model', createdAt: new Date() });
        mockPrisma.qualityAlert.count.mockResolvedValue(0);
        mockPrisma.qualityAlert.create.mockResolvedValue({
            id: 'alert-1',
            type: QualityAlertType.MODEL,
            scope: 'model:Problematic Model',
            reason: 'RMA rate 15.00% exceeds threshold 5%',
            active: true,
            createdAt: new Date()
        });

        // Act
        await service.detectAlerts();

        // Assert - Le service NE DOIT PAS :
        // 1. Modifier un Asset
        // 2. Rappeler des produits
        // 3. Changer des statuts

        // Vérifier qu'aucune méthode de modification d'Asset n'existe
        expect(typeof (service as any).updateAsset).toBe('undefined');
        expect(typeof (service as any).recallAssets).toBe('undefined');
        expect(typeof (service as any).changeAssetStatus).toBe('undefined');

        // Le service a créé une alerte informative UNIQUEMENT
        expect(mockPrisma.qualityAlert.create).toHaveBeenCalled();
    });

    // ============================================
    // TEST 4 : Blocage des nouveaux assets si alerte active
    // ============================================

    test('should_block_new_assets_when_alert_active', async () => {
        // Arrange - Une alerte active existe pour un modèle
        const assetId = 'new-asset-001';
        const model = 'Toxic Model';

        (mockAssetProvider.getAssetModel as jest.Mock).mockResolvedValue(model);
        (mockAssetProvider.getAssetSupplier as jest.Mock).mockResolvedValue(null);

        // Alerte active pour ce modèle
        mockPrisma.qualityAlert.findFirst.mockResolvedValue({
            id: 'alert-active',
            type: QualityAlertType.MODEL,
            scope: `model:${model}`,
            reason: 'RMA rate 10.00% exceeds threshold 5%',
            active: true,
            createdAt: new Date()
        });

        // Act
        const result = await service.isAssetBlocked(assetId);

        // Assert
        expect(result.isBlocked).toBe(true);
        expect(result.reason).toContain('10.00%');
        expect(result.alertId).toBe('alert-active');
    });

    // ============================================
    // TEST 5 : Les RMA alimentent les métriques
    // ============================================

    test('should_feed_metrics_from_rma', async () => {
        // Arrange - Le RmaProvider fournit des données RMA
        const mockRmaData = new Map<string, { total: number; rmaCount: number }>([
            ['Supplier A', { total: 200, rmaCount: 12 }]  // 6% de RMA
        ]);
        (mockRmaProvider.getRmaCountBySupplier as jest.Mock).mockResolvedValue(mockRmaData);
        (mockRmaProvider.getRmaCountByModel as jest.Mock).mockResolvedValue(new Map());

        mockPrisma.qualityMetric.create.mockImplementation((data: any) => Promise.resolve({
            id: 'metric-supplier',
            ...data.data,
            createdAt: new Date()
        }));
        mockPrisma.qualityAlert.count.mockResolvedValue(0);
        mockPrisma.qualityAlert.create.mockImplementation((data: any) => Promise.resolve({
            id: 'alert-supplier',
            ...data.data,
            createdAt: new Date()
        }));

        // Act
        const results = await service.calculateRmaRatePerSupplier();

        // Assert - Les données RMA sont utilisées pour calculer les métriques
        expect(results).toHaveLength(1);
        const firstResult = results[0]!;
        expect(firstResult.scope).toBe('Supplier A');
        expect(firstResult.rmaRate).toBe(6);  // 12/200 * 100 = 6%
        expect(firstResult.rmaCount).toBe(12);
        expect(firstResult.totalAssets).toBe(200);

        // La métrique a été sauvegardée
        expect(mockPrisma.qualityMetric.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                key: 'RMA_RATE',
                value: 6,
                scope: 'supplier:Supplier A'
            })
        });
    });
});
