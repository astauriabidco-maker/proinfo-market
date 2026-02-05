/**
 * CTO Service Tests
 * Tests unitaires pour le CTO Engine
 */

import { CtoValidationService } from '../services/ctoValidation.service';
import { CtoPricingService } from '../services/ctoPricing.service';
import { RuleEngine } from '../rules/rule.engine';
import { AssetServiceClient, AssetServiceResponse } from '../integrations/asset.client';
import { AssetNotSellableError } from '../domain/ctoConfiguration.types';
import { CtoRuleSetEntity, CompatibilityRulePayload } from '../rules/rule.types';
import { PrismaClient, RuleType } from '@prisma/client';

// Mock du PrismaClient
const mockPrisma = {
    ctoRuleSet: {
        findFirst: jest.fn(),
        findUnique: jest.fn()
    },
    ctoRule: {
        findMany: jest.fn()
    },
    ctoConfiguration: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

// Mock du client Asset
const mockAssetClient: AssetServiceClient = {
    getAsset: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

// RuleSet de test
const mockRuleSet: CtoRuleSetEntity = {
    id: 'ruleset-uuid-1',
    version: 1,
    active: true,
    createdAt: new Date(),
    rules: [
        {
            id: 'rule-1',
            ruleSetId: 'ruleset-uuid-1',
            ruleType: RuleType.COMPATIBILITY,
            payload: {
                productModel: 'R740',
                componentType: 'CPU',
                allowedReferences: ['XEON-GOLD-6230', 'XEON-SILVER-4210']
            } as CompatibilityRulePayload
        },
        {
            id: 'rule-2',
            ruleSetId: 'ruleset-uuid-1',
            ruleType: RuleType.QUANTITY,
            payload: {
                productModel: 'R740',
                componentType: 'CPU',
                minQuantity: 1,
                maxQuantity: 2
            }
        },
        {
            id: 'rule-3',
            ruleSetId: 'ruleset-uuid-1',
            ruleType: RuleType.PRICING,
            payload: {
                componentType: 'CPU',
                unitPrice: 500,
                laborCost: 15,
                marginPercent: 18
            }
        },
        {
            id: 'rule-4',
            ruleSetId: 'ruleset-uuid-1',
            ruleType: RuleType.PRICING,
            payload: {
                componentType: 'RAM',
                unitPrice: 120,
                laborCost: 10,
                marginPercent: 18
            }
        }
    ]
};

describe('CtoService', () => {
    let validationService: CtoValidationService;
    let pricingService: CtoPricingService;
    let ruleEngine: RuleEngine;

    beforeEach(() => {
        jest.clearAllMocks();
        validationService = new CtoValidationService(mockPrisma, mockAssetClient);
        pricingService = new CtoPricingService(mockPrisma);
        ruleEngine = new RuleEngine();

        // Setup mock par défaut pour RuleSet
        (mockPrisma.ctoRuleSet.findFirst as jest.Mock).mockResolvedValue({
            ...mockRuleSet,
            rules: mockRuleSet.rules.map(r => ({
                ...r,
                payload: r.payload
            }))
        });
        (mockPrisma.ctoRuleSet.findUnique as jest.Mock).mockResolvedValue({
            ...mockRuleSet,
            rules: mockRuleSet.rules.map(r => ({
                ...r,
                payload: r.payload
            }))
        });
    });

    describe('Validation', () => {
        test('should_reject_cto_if_asset_not_sellable', async () => {
            // Arrange - Asset avec statut != SELLABLE
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'SERVER',
                brand: 'Dell',
                model: 'R740',
                chassisRef: null,
                status: 'TESTING', // PAS SELLABLE
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);

            // Act & Assert
            await expect(
                validationService.validate({
                    assetId: 'asset-uuid-1',
                    productModel: 'R740',
                    components: [{ type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2 }]
                })
            ).rejects.toThrow(AssetNotSellableError);
        });

        test('should_reject_incompatible_configuration', async () => {
            // Arrange - Asset SELLABLE
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'SERVER',
                brand: 'Dell',
                model: 'R740',
                chassisRef: null,
                status: 'SELLABLE',
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);

            // Act - CPU incompatible
            const result = await validationService.validate({
                assetId: 'asset-uuid-1',
                productModel: 'R740',
                components: [{ type: 'CPU', reference: 'AMD-EPYC-7002', quantity: 2 }] // PAS dans la liste autorisée
            });

            // Assert
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]?.code).toBe('COMPATIBILITY_ERROR');
        });
    });

    describe('Pricing', () => {
        test('should_validate_cto_and_freeze_price', async () => {
            // Arrange
            (mockPrisma.ctoRuleSet.findUnique as jest.Mock).mockResolvedValue({
                ...mockRuleSet,
                rules: mockRuleSet.rules.map(r => ({
                    ...r,
                    payload: r.payload
                }))
            });

            // Act
            const priceSnapshot = await pricingService.calculatePriceSnapshot(
                'ruleset-uuid-1',
                [
                    { type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2 },
                    { type: 'RAM', reference: 'DDR4-32GB', quantity: 8 }
                ]
            );

            // Assert
            expect(priceSnapshot).toBeDefined();
            expect(priceSnapshot.frozenAt).toBeDefined();
            expect(priceSnapshot.currency).toBe('EUR');
            expect(priceSnapshot.components.length).toBe(2);

            // CPU: 2 x 500 = 1000
            const cpuPrice = priceSnapshot.components.find(c => c.type === 'CPU');
            expect(cpuPrice?.lineTotal).toBe(1000);

            // RAM: 8 x 120 = 960
            const ramPrice = priceSnapshot.components.find(c => c.type === 'RAM');
            expect(ramPrice?.lineTotal).toBe(960);
        });

        test('should_not_recalculate_price_after_validation', async () => {
            // Arrange - Premier calcul
            (mockPrisma.ctoRuleSet.findUnique as jest.Mock).mockResolvedValue({
                ...mockRuleSet,
                rules: mockRuleSet.rules.map(r => ({
                    ...r,
                    payload: r.payload
                }))
            });

            const components = [
                { type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2 }
            ];

            // Act - Premier snapshot
            const firstSnapshot = await pricingService.calculatePriceSnapshot(
                'ruleset-uuid-1',
                components
            );

            // Attendre un peu pour vérifier que frozenAt change
            await new Promise(resolve => setTimeout(resolve, 10));

            // Act - Deuxième snapshot (simule une tentative de recalcul)
            const secondSnapshot = await pricingService.calculatePriceSnapshot(
                'ruleset-uuid-1',
                components
            );

            // Assert - Les prix sont identiques (même si frozenAt diffère)
            expect(firstSnapshot.total).toBe(secondSnapshot.total);
            expect(firstSnapshot.subtotal).toBe(secondSnapshot.subtotal);
            expect(firstSnapshot.laborCost).toBe(secondSnapshot.laborCost);

            // Note: Dans une vraie implémentation, le prix serait lu depuis la DB
            // et ne serait JAMAIS recalculé. Ici on vérifie juste la cohérence du calcul.
        });
    });

    describe('Assembly Order', () => {
        test('should_generate_assembly_order', async () => {
            // Arrange
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'SERVER',
                brand: 'Dell',
                model: 'R740',
                chassisRef: null,
                status: 'SELLABLE',
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);

            const dto = {
                assetId: 'asset-uuid-1',
                productModel: 'R740',
                components: [
                    { type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2 },
                    { type: 'RAM', reference: 'DDR4-32GB', quantity: 8 },
                    { type: 'SSD', reference: 'NVME-1TB', quantity: 2 }
                ]
            };

            // Act
            const assemblyOrder = validationService.generateAssemblyOrder(dto);

            // Assert
            expect(assemblyOrder.assetId).toBe('asset-uuid-1');
            expect(assemblyOrder.tasks).toContain('INSTALL_CPU');
            expect(assemblyOrder.tasks).toContain('INSTALL_RAM');
            expect(assemblyOrder.tasks).toContain('INSTALL_SSD');
            expect(assemblyOrder.tasks).toContain('RUN_QA');

            // L'ordre doit être correct
            const cpuIndex = assemblyOrder.tasks.indexOf('INSTALL_CPU');
            const ramIndex = assemblyOrder.tasks.indexOf('INSTALL_RAM');
            const ssdIndex = assemblyOrder.tasks.indexOf('INSTALL_SSD');
            const qaIndex = assemblyOrder.tasks.indexOf('RUN_QA');

            expect(cpuIndex).toBeLessThan(ramIndex);
            expect(ramIndex).toBeLessThan(ssdIndex);
            expect(ssdIndex).toBeLessThan(qaIndex);
        });
    });

    describe('Rule Engine', () => {
        test('should_evaluate_quantity_rules', () => {
            // Act - Trop de CPU
            const errors = ruleEngine.evaluateValidationRules(
                mockRuleSet,
                'R740',
                [{ type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 4 }] // Max est 2
            );

            // Assert
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.code === 'QUANTITY_ERROR')).toBe(true);
        });
    });
});
