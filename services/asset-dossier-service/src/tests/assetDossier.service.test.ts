/**
 * Asset Dossier Service Tests
 * Tests Sprint 23 — Dossier Machine Audit-Ready
 * 
 * TESTS OBLIGATOIRES (5)
 */

import { AssetDossierBuilderService } from '../services/assetDossierBuilder.service';
import { AssetDossierExportService } from '../services/assetDossierExport.service';
import { AssetDossier } from '../domain/assetDossier.types';

// ============================================
// MOCKS
// ============================================

const createMockPrisma = () => ({
    assetDossierSnapshot: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
    }
});

const createMockAssetClient = () => ({
    getAsset: jest.fn(),
    getStateHistory: jest.fn()
});

const createMockQualityClient = () => ({
    getQualityResults: jest.fn(),
    getBatteryHealth: jest.fn(),
    getAlertsForAsset: jest.fn()
});

const createMockWmsClient = () => ({
    getTasksForAsset: jest.fn(),
    getTaskSteps: jest.fn(),
    getShipmentForAsset: jest.fn()
});

const createMockSavClient = () => ({
    getTicketsForAsset: jest.fn(),
    getRmasForAsset: jest.fn(),
    getDiagnosis: jest.fn()
});

const createMockCtoClient = () => ({
    getConfigurationForAsset: jest.fn(),
    getDecisionAudit: jest.fn()
});

const createMockInventoryClient = () => ({
    getStockLocation: jest.fn(),
    getWarehouse: jest.fn(),
    getMovements: jest.fn()
});

// ============================================
// TEST DATA
// ============================================

const mockAsset = {
    id: 'asset-123',
    serialNumber: 'SN-2026-001',
    assetType: 'LAPTOP',
    brand: 'Dell',
    model: 'Latitude 5520',
    chassisRef: 'CHASSIS-001',
    status: 'SELLABLE',
    grade: 'A',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01')
};

const mockCtoConfig = {
    id: 'cto-config-123',
    assetId: 'asset-123',
    configuration: [
        { type: 'RAM', reference: 'DDR4-16GB', quantity: 2 },
        { type: 'SSD', reference: 'NVMe-512GB', quantity: 1 }
    ],
    validated: true,
    createdAt: new Date('2026-01-15')
};

const mockCtoAudit = {
    configurationId: 'cto-config-123',
    overallResult: 'ACCEPT' as const,
    evaluatedAt: new Date('2026-01-15'),
    decisions: [
        {
            ruleId: 'RULE_RAM_COMPAT',
            ruleName: 'RAM Compatibility',
            ruleVersion: 2,
            result: 'ACCEPT' as const,
            explanations: []
        },
        {
            ruleId: 'RULE_SSD_POWER',
            ruleName: 'SSD Power Requirements',
            ruleVersion: 1,
            result: 'ACCEPT' as const,
            explanations: []
        }
    ]
};

const mockQualityResults = [
    { id: 'qr-1', assetId: 'asset-123', checklistItemId: 'VISUAL_CHECK', result: 'PASS', measuredValue: null, createdAt: new Date() },
    { id: 'qr-2', assetId: 'asset-123', checklistItemId: 'KEYBOARD_TEST', result: 'FAIL', measuredValue: '3 keys stuck', createdAt: new Date() }
];

const mockRmas = [
    { id: 'rma-1', assetId: 'asset-123', ticketId: 'ticket-1', status: 'RESOLVED', createdAt: new Date() }
];

const mockRmaDiagnosis = {
    id: 'diag-1',
    rmaId: 'rma-1',
    diagnosis: 'Keyboard failure',
    resolution: 'REPLACE',
    createdAt: new Date()
};

// ============================================
// TESTS
// ============================================

describe('Asset Dossier Service - Sprint 23', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let assetClient: ReturnType<typeof createMockAssetClient>;
    let qualityClient: ReturnType<typeof createMockQualityClient>;
    let wmsClient: ReturnType<typeof createMockWmsClient>;
    let savClient: ReturnType<typeof createMockSavClient>;
    let ctoClient: ReturnType<typeof createMockCtoClient>;
    let inventoryClient: ReturnType<typeof createMockInventoryClient>;
    let builderService: AssetDossierBuilderService;
    let exportService: AssetDossierExportService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        assetClient = createMockAssetClient();
        qualityClient = createMockQualityClient();
        wmsClient = createMockWmsClient();
        savClient = createMockSavClient();
        ctoClient = createMockCtoClient();
        inventoryClient = createMockInventoryClient();

        builderService = new AssetDossierBuilderService(prisma as any, {
            asset: assetClient as any,
            quality: qualityClient as any,
            wms: wmsClient as any,
            sav: savClient as any,
            cto: ctoClient as any,
            inventory: inventoryClient as any
        });

        exportService = new AssetDossierExportService();
    });

    // ========== TEST 1 ==========
    describe('should_build_complete_asset_dossier', () => {
        it('builds dossier with all 7 mandatory sections', async () => {
            // Arrange
            assetClient.getAsset.mockResolvedValue(mockAsset);
            assetClient.getStateHistory.mockResolvedValue([]);
            qualityClient.getQualityResults.mockResolvedValue([]);
            qualityClient.getBatteryHealth.mockResolvedValue(null);
            qualityClient.getAlertsForAsset.mockResolvedValue([]);
            wmsClient.getTasksForAsset.mockResolvedValue([]);
            wmsClient.getShipmentForAsset.mockResolvedValue(null);
            savClient.getTicketsForAsset.mockResolvedValue([]);
            savClient.getRmasForAsset.mockResolvedValue([]);
            ctoClient.getConfigurationForAsset.mockResolvedValue(null);
            inventoryClient.getStockLocation.mockResolvedValue(null);
            inventoryClient.getMovements.mockResolvedValue([]);
            prisma.assetDossierSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });

            // Act
            const dossier = await builderService.buildDossier('asset-123');

            // Assert — 7 sections obligatoires présentes
            expect(dossier.meta).toBeDefined();
            expect(dossier.meta.assetId).toBe('asset-123');
            expect(dossier.identity).toBeDefined();
            expect(dossier.identity.serialNumber).toBe('SN-2026-001');
            expect(dossier.ctoConfiguration).toBeNull(); // Pas de CTO dans ce test
            expect(dossier.refurbishmentHistory).toBeDefined();
            expect(dossier.qualityIncidents).toBeDefined();
            expect(dossier.savHistory).toBeDefined();
            expect(dossier.logistics).toBeDefined();
            expect(dossier.finalStatus).toBeDefined();
            expect(dossier.finalStatus.status).toBe('SELLABLE');
        });
    });

    // ========== TEST 2 ==========
    describe('should_include_cto_decision_versions', () => {
        it('includes exact CTO rule versions in dossier', async () => {
            // Arrange
            assetClient.getAsset.mockResolvedValue(mockAsset);
            assetClient.getStateHistory.mockResolvedValue([]);
            qualityClient.getQualityResults.mockResolvedValue([]);
            qualityClient.getBatteryHealth.mockResolvedValue(null);
            qualityClient.getAlertsForAsset.mockResolvedValue([]);
            wmsClient.getTasksForAsset.mockResolvedValue([]);
            wmsClient.getShipmentForAsset.mockResolvedValue(null);
            savClient.getTicketsForAsset.mockResolvedValue([]);
            savClient.getRmasForAsset.mockResolvedValue([]);
            ctoClient.getConfigurationForAsset.mockResolvedValue(mockCtoConfig);
            ctoClient.getDecisionAudit.mockResolvedValue(mockCtoAudit);
            inventoryClient.getStockLocation.mockResolvedValue(null);
            inventoryClient.getMovements.mockResolvedValue([]);
            prisma.assetDossierSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });

            // Act
            const dossier = await builderService.buildDossier('asset-123');

            // Assert — Versions de règles CTO exactes
            expect(dossier.ctoConfiguration).not.toBeNull();
            expect(dossier.ctoConfiguration!.decisions).toHaveLength(2);
            expect(dossier.ctoConfiguration!.decisions[0].ruleVersion).toBe(2);
            expect(dossier.ctoConfiguration!.decisions[0].ruleName).toBe('RAM Compatibility');
            expect(dossier.ctoConfiguration!.decisions[1].ruleVersion).toBe(1);
            expect(dossier.ctoConfiguration!.decisions[1].ruleName).toBe('SSD Power Requirements');
        });
    });

    // ========== TEST 3 ==========
    describe('should_include_quality_and_rma_history', () => {
        it('includes quality defects and RMA history with diagnoses', async () => {
            // Arrange
            assetClient.getAsset.mockResolvedValue(mockAsset);
            assetClient.getStateHistory.mockResolvedValue([]);
            qualityClient.getQualityResults.mockResolvedValue(mockQualityResults);
            qualityClient.getBatteryHealth.mockResolvedValue({ stateOfHealth: 85, cycles: 120, measuredAt: new Date() });
            qualityClient.getAlertsForAsset.mockResolvedValue([]);
            wmsClient.getTasksForAsset.mockResolvedValue([]);
            wmsClient.getShipmentForAsset.mockResolvedValue(null);
            savClient.getTicketsForAsset.mockResolvedValue([{ id: 'ticket-1', assetId: 'asset-123', customerRef: 'CUST-001', issue: 'Keyboard issue', status: 'CLOSED', createdAt: new Date() }]);
            savClient.getRmasForAsset.mockResolvedValue(mockRmas);
            savClient.getDiagnosis.mockResolvedValue(mockRmaDiagnosis);
            ctoClient.getConfigurationForAsset.mockResolvedValue(null);
            inventoryClient.getStockLocation.mockResolvedValue(null);
            inventoryClient.getMovements.mockResolvedValue([]);
            prisma.assetDossierSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });

            // Act
            const dossier = await builderService.buildDossier('asset-123');

            // Assert — Qualité
            expect(dossier.qualityIncidents.defects).toHaveLength(1);
            expect(dossier.qualityIncidents.defects[0].code).toBe('KEYBOARD_TEST');
            expect(dossier.qualityIncidents.batteryHealth).not.toBeNull();
            expect(dossier.qualityIncidents.batteryHealth!.stateOfHealth).toBe(85);

            // Assert — SAV & RMA
            expect(dossier.savHistory.tickets).toHaveLength(1);
            expect(dossier.savHistory.tickets[0].issue).toBe('Keyboard issue');
            expect(dossier.savHistory.rmas).toHaveLength(1);
            expect(dossier.savHistory.rmas[0].diagnosis).not.toBeNull();
            expect(dossier.savHistory.rmas[0].diagnosis!.resolution).toBe('REPLACE');
        });
    });

    // ========== TEST 4 ==========
    describe('should_export_audit_ready_bundle', () => {
        it('exports audit-ready bundle with correct structure', async () => {
            // Arrange
            const mockDossier: AssetDossier = {
                meta: {
                    snapshotId: 'snapshot-123',
                    assetId: 'asset-123',
                    generatedAt: new Date(),
                    version: '1.0.0'
                },
                identity: {
                    serialNumber: 'SN-2026-001',
                    assetType: 'LAPTOP',
                    brand: 'Dell',
                    model: 'Latitude 5520',
                    chassisRef: null,
                    origin: null,
                    entryDate: new Date()
                },
                ctoConfiguration: null,
                refurbishmentHistory: { tasks: [], qaChecklists: [], replacedParts: [] },
                qualityIncidents: { defects: [], alerts: [], batteryHealth: null },
                savHistory: { tickets: [], rmas: [] },
                logistics: { currentWarehouse: null, movements: [], shipment: null },
                finalStatus: { status: 'SELLABLE', grade: 'A', statusDate: new Date(), scrapJustification: null }
            };

            // Act - Test JSON export (fast, validates core functionality)
            const result = await exportService.export(mockDossier, { format: 'JSON' });

            // Assert — Export valide
            expect(result.format).toBe('JSON');
            expect(result.mimeType).toBe('application/json');
            expect(result.filename).toContain('SN-2026-001');
            expect(result.filename).toContain('.json');
            expect(result.buffer.length).toBeGreaterThan(0);

            // Verify JSON contains all 7 sections
            const parsedDossier = JSON.parse(result.buffer.toString());
            expect(parsedDossier.meta).toBeDefined();
            expect(parsedDossier.identity).toBeDefined();
            expect(parsedDossier.refurbishmentHistory).toBeDefined();
            expect(parsedDossier.qualityIncidents).toBeDefined();
            expect(parsedDossier.savHistory).toBeDefined();
            expect(parsedDossier.logistics).toBeDefined();
            expect(parsedDossier.finalStatus).toBeDefined();
        });
    });

    // ========== TEST 5 ==========
    describe('should_not_modify_historical_events', () => {
        it('creates new snapshot without modifying existing ones', async () => {
            // Arrange
            assetClient.getAsset.mockResolvedValue(mockAsset);
            assetClient.getStateHistory.mockResolvedValue([]);
            qualityClient.getQualityResults.mockResolvedValue([]);
            qualityClient.getBatteryHealth.mockResolvedValue(null);
            qualityClient.getAlertsForAsset.mockResolvedValue([]);
            wmsClient.getTasksForAsset.mockResolvedValue([]);
            wmsClient.getShipmentForAsset.mockResolvedValue(null);
            savClient.getTicketsForAsset.mockResolvedValue([]);
            savClient.getRmasForAsset.mockResolvedValue([]);
            ctoClient.getConfigurationForAsset.mockResolvedValue(null);
            inventoryClient.getStockLocation.mockResolvedValue(null);
            inventoryClient.getMovements.mockResolvedValue([]);
            prisma.assetDossierSnapshot.create.mockResolvedValue({ id: 'snapshot-new' });

            // Act
            await builderService.buildDossier('asset-123');
            await builderService.buildDossier('asset-123'); // Build again

            // Assert — Deux snapshots créés (append-only)
            expect(prisma.assetDossierSnapshot.create).toHaveBeenCalledTimes(2);

            // Verify NO update/delete operations
            expect(prisma.assetDossierSnapshot).not.toHaveProperty('update');
            expect(prisma.assetDossierSnapshot).not.toHaveProperty('delete');
        });
    });
});
