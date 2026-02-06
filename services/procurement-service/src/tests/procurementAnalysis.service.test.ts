/**
 * Procurement Analysis Service Tests
 * Tests unitaires pour le service d'analyse d'approvisionnement
 * 
 * RÈGLE : Ces tests vérifient que le système n'achète JAMAIS automatiquement
 */

import { ProcurementDecision } from '@prisma/client';
import {
    ProcurementAnalysisService,
    SalesDataProvider,
    QualityDataProvider
} from '../services/procurementAnalysis.service';
import {
    MIN_MARGIN_THRESHOLD,
    AVG_RECONDITIONING_COST,
    AVG_RMA_COST,
    DEFAULT_RMA_RATE
} from '../domain/procurementDecision.types';

// Mock du PrismaClient
const mockPrisma = {
    procurementLot: {
        create: jest.fn(),
        findMany: jest.fn()
    }
} as any;

// Mock des providers
const mockSalesProvider: SalesDataProvider = {
    getAverageSellPrice: jest.fn()
};

const mockQualityProvider: QualityDataProvider = {
    getRmaRate: jest.fn(),
    hasActiveAlert: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('ProcurementAnalysisService', () => {
    let service: ProcurementAnalysisService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ProcurementAnalysisService(mockPrisma, mockSalesProvider, mockQualityProvider);
    });

    // ============================================
    // TEST 1 : Simulation de marge avant achat
    // ============================================

    test('should_simulate_margin_before_purchase', async () => {
        // Arrange - Un lot rentable
        const request = {
            supplier: 'LEASECO',
            model: 'Dell PowerEdge R740',
            quantity: 10,
            unitCost: 1200
        };

        (mockSalesProvider.getAverageSellPrice as jest.Mock).mockResolvedValue(2500);
        (mockQualityProvider.getRmaRate as jest.Mock).mockResolvedValue(2);
        (mockQualityProvider.hasActiveAlert as jest.Mock).mockResolvedValue(false);

        // Act
        const result = await service.simulateLot(request);

        // Assert
        expect(result.request).toEqual(request);
        expect(result.costs).toBeDefined();
        expect(result.costs.purchaseCost).toBe(12000);  // 1200 × 10
        expect(result.costs.reconditioningCost).toBe(10 * AVG_RECONDITIONING_COST);  // 500
        expect(result.costs.rmaCost).toBe(10 * 0.02 * AVG_RMA_COST);  // 30
        expect(result.estimatedValue).toBe(25000);  // 2500 × 10
        expect(result.estimatedMargin).toBeGreaterThan(0);
        expect(result.suggestedDecision).toBeDefined();
        expect(result.calculatedAt).toBeInstanceOf(Date);

        // Vérifier les événements
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('ProcurementSimulationRun')
        );
    });

    // ============================================
    // TEST 2 : Rejet si marge trop faible
    // ============================================

    test('should_reject_lot_with_low_margin', async () => {
        // Arrange - Un lot avec marge < 10%
        const request = {
            supplier: 'CHEAPCO',
            model: 'Generic Server',
            quantity: 10,
            unitCost: 1000  // Coût élevé
        };

        // Prix de vente faible → marge faible
        (mockSalesProvider.getAverageSellPrice as jest.Mock).mockResolvedValue(1050);  // Seulement 5% au-dessus du coût
        (mockQualityProvider.getRmaRate as jest.Mock).mockResolvedValue(2);
        (mockQualityProvider.hasActiveAlert as jest.Mock).mockResolvedValue(false);

        // Act
        const result = await service.simulateLot(request);

        // Assert
        expect(result.suggestedDecision).toBe(ProcurementDecision.REJECT);
        expect(result.decisionReason).toContain('below minimum threshold');
        expect(result.estimatedMargin).toBeLessThan(MIN_MARGIN_THRESHOLD);
    });

    // ============================================
    // TEST 3 : Flag si alerte qualité active
    // ============================================

    test('should_flag_lot_with_quality_alert', async () => {
        // Arrange - Un modèle avec alerte qualité
        const request = {
            supplier: 'LEASECO',
            model: 'Problematic Model',
            quantity: 10,
            unitCost: 1000
        };

        (mockSalesProvider.getAverageSellPrice as jest.Mock).mockResolvedValue(2000);  // Marge OK
        (mockQualityProvider.getRmaRate as jest.Mock).mockResolvedValue(5);
        (mockQualityProvider.hasActiveAlert as jest.Mock).mockResolvedValue(true);  // ALERTE ACTIVE

        // Act
        const result = await service.simulateLot(request);

        // Assert
        expect(result.suggestedDecision).toBe(ProcurementDecision.REVIEW);
        expect(result.decisionReason).toContain('quality alert');
        expect(result.warnings).toContain('Active quality alert on this model - manual review required');
    });

    // ============================================
    // TEST 4 : PAS d'acceptation automatique
    // ============================================

    test('should_not_auto_accept_lot', async () => {
        // Ce test vérifie que le service NE PURCHASE JAMAIS automatiquement
        // La décision est PROPOSÉE, pas imposée

        const request = {
            supplier: 'LEASECO',
            model: 'Dell PowerEdge R740',
            quantity: 50,
            unitCost: 1200
        };

        (mockSalesProvider.getAverageSellPrice as jest.Mock).mockResolvedValue(2500);
        (mockQualityProvider.getRmaRate as jest.Mock).mockResolvedValue(2);
        (mockQualityProvider.hasActiveAlert as jest.Mock).mockResolvedValue(false);

        // Act
        const result = await service.simulateLot(request);

        // Assert - La décision est SUGGESTED, pas EXECUTED
        expect(result.suggestedDecision).toBe(ProcurementDecision.ACCEPT);

        // Vérifier que le service ne crée PAS de lot automatiquement
        expect(mockPrisma.procurementLot.create).not.toHaveBeenCalled();

        // Vérifier qu'aucune méthode d'achat automatique n'existe
        expect(typeof (service as any).autoPurchase).toBe('undefined');
        expect(typeof (service as any).executeDecision).toBe('undefined');
        expect(typeof (service as any).confirmPurchase).toBe('undefined');
    });

    // ============================================
    // TEST 5 : Enregistrement de la décision
    // ============================================

    test('should_record_procurement_decision', async () => {
        // Arrange
        const dto = {
            supplier: 'LEASECO',
            supplierType: 'LEASING' as const,
            model: 'Dell PowerEdge R740',
            quantity: 50,
            unitCost: 1200,
            totalPurchasePrice: 60000,
            estimatedValue: 125000,
            estimatedMargin: 45.6,
            decision: ProcurementDecision.ACCEPT,
            comment: 'Approved by procurement manager'
        };

        mockPrisma.procurementLot.create.mockResolvedValue({
            id: 'lot-uuid-1',
            ...dto,
            createdAt: new Date()
        });

        // Act
        const result = await service.recordDecision(dto);

        // Assert
        expect(result.id).toBe('lot-uuid-1');
        expect(mockPrisma.procurementLot.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                supplierName: dto.supplier,
                supplierType: dto.supplierType,
                model: dto.model,
                totalUnitsDeclared: dto.quantity,
                decision: ProcurementDecision.ACCEPT,
                decisionComment: dto.comment
            })
        });

        // Vérifier l'événement
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('ProcurementDecisionRecorded')
        );
    });
});
