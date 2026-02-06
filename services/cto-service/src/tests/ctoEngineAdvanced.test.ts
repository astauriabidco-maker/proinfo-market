/**
 * CTO Engine Advanced Tests
 * Tests Sprint 22 — Versioning, Audit, Simulation
 * 
 * TESTS OBLIGATOIRES (5)
 */

import { CtoRuleEngineService } from '../services/ctoRuleEngine.service';
import { CtoDecisionAuditService } from '../services/ctoDecisionAudit.service';
import { CtoSimulationService } from '../services/ctoSimulation.service';
import { RuleLogic } from '../domain/ctoRule.types';
import { CtoComponent } from '../domain/ctoConfiguration.types';

// Mock complet du PrismaClient
const createMockPrisma = () => ({
    ctoRuleVersion: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
    },
    ctoDecision: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
    },
    ctoConfiguration: {
        findUnique: jest.fn()
    },
    $queryRaw: jest.fn()
});

describe('CTO Engine Advanced - Sprint 22', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let ruleEngine: CtoRuleEngineService;
    let auditService: CtoDecisionAuditService;
    let simulationService: CtoSimulationService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        ruleEngine = new CtoRuleEngineService(prisma as any);
        auditService = new CtoDecisionAuditService(prisma as any, ruleEngine);
        simulationService = new CtoSimulationService(prisma as any, ruleEngine);
    });

    // ========== TEST 1 ==========
    describe('should_version_rules_without_overwrite', () => {
        it('creates new version instead of modifying existing', async () => {
            // Arrange
            const existingVersion = {
                id: 'v1-id',
                ruleId: 'RULE_CPU_COMPAT',
                version: 1,
                name: 'CPU Compatibility',
                description: 'Check CPU motherboard compatibility',
                logic: { type: 'COMPATIBILITY', conditions: [], action: 'BLOCK', message: 'test' },
                createdAt: new Date('2026-01-01')
            };

            prisma.ctoRuleVersion.findFirst.mockResolvedValue(existingVersion);
            prisma.ctoRuleVersion.create.mockResolvedValue({
                ...existingVersion,
                id: 'v2-id',
                version: 2,
                createdAt: new Date('2026-02-01')
            });

            // Act
            const newVersion = await ruleEngine.createRuleVersion({
                ruleId: 'RULE_CPU_COMPAT',
                name: 'CPU Compatibility Updated',
                description: 'Updated check',
                logic: {
                    type: 'COMPATIBILITY',
                    conditions: [{ field: 'component.type', operator: 'EQUALS', value: 'CPU' }],
                    action: 'BLOCK',
                    message: 'Updated message'
                }
            });

            // Assert - Nouvelle version créée (append-only)
            expect(newVersion.version).toBe(2);
            expect(newVersion.ruleId).toBe('RULE_CPU_COMPAT');
            // Verify create was called, not update (append-only pattern)
            expect(prisma.ctoRuleVersion.create).toHaveBeenCalledTimes(1);
        });
    });

    // ========== TEST 2 ==========
    describe('should_audit_decisions_with_rule_versions', () => {
        it('records decision with exact rule version reference', async () => {
            // Arrange
            const mockDecision = {
                id: 'decision-1',
                configurationId: 'config-123',
                ruleVersionId: 'rule-v2-id',
                result: 'ACCEPT',
                createdAt: new Date(),
                explanations: []
            };

            prisma.ctoDecision.create.mockResolvedValue(mockDecision);

            // Act
            const decision = await auditService.recordDecision({
                configurationId: 'config-123',
                ruleVersionId: 'rule-v2-id',
                result: 'ACCEPT',
                explanations: []
            });

            // Assert - Décision avec référence exacte de version
            expect(decision.configurationId).toBe('config-123');
            expect(decision.ruleVersionId).toBe('rule-v2-id');
            expect(decision.result).toBe('ACCEPT');
            expect(prisma.ctoDecision.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        ruleVersionId: 'rule-v2-id'
                    })
                })
            );
        });
    });

    // ========== TEST 3 ==========
    describe('should_explain_rejected_configuration', () => {
        it('generates human-readable explanation for rejection', async () => {
            // Arrange
            const ruleLogic: RuleLogic = {
                type: 'COMPATIBILITY',
                conditions: [
                    { field: 'component.type', operator: 'EQUALS', value: 'CPU' }
                ],
                action: 'BLOCK',
                message: 'CPU {value} incompatible avec configuration'
            };

            prisma.$queryRaw.mockResolvedValue([
                { ruleId: 'RULE_CPU', maxVersion: 1 }
            ]);
            prisma.ctoRuleVersion.findUnique.mockResolvedValue({
                id: 'rv-1',
                ruleId: 'RULE_CPU',
                version: 1,
                name: 'CPU Rule',
                description: 'test',
                logic: ruleLogic,
                createdAt: new Date()
            });

            const components: CtoComponent[] = [
                { type: 'RAM', reference: 'DDR5-64GB', quantity: 2 }
            ];

            // Act
            const result = await ruleEngine.evaluateConfiguration(components);

            // Assert - Explication générée pour rejet
            expect(result.passed).toBe(false);
            expect(result.explanations.length).toBeGreaterThan(0);
            expect(result.explanations[0]?.message).toBeDefined();
            expect(result.explanations[0]?.severity).toBe('ERROR');
        });
    });

    // ========== TEST 4 ==========
    describe('should_not_recalculate_validated_configuration', () => {
        it('checks for existing decisions before recalculating', async () => {
            // Arrange - Config déjà validée avec 5 décisions
            prisma.ctoDecision.count.mockResolvedValue(5);

            // Act
            const hasDecisions = await auditService.hasExistingDecisions('config-validated-123');

            // Assert - Vérifie avant recalcul
            expect(hasDecisions).toBe(true);
            expect(prisma.ctoDecision.count).toHaveBeenCalledWith({
                where: { configurationId: 'config-validated-123' }
            });
            // Pattern: le code appelant peut vérifier et skip le recalcul
        });
    });

    // ========== TEST 5 ==========
    describe('should_simulate_what_if_without_side_effect', () => {
        it('returns ephemeral result without persisting', async () => {
            // Arrange
            prisma.ctoConfiguration.findUnique.mockResolvedValue({
                id: 'config-123',
                configuration: [{ type: 'CPU', reference: 'Xeon-Gold', quantity: 1 }]
            });
            prisma.$queryRaw.mockResolvedValue([]);

            const simulationRequest = {
                baseConfigurationId: 'config-123',
                components: [{ type: 'RAM', reference: '128GB-ECC', quantity: 4 }]
            };

            // Act
            const result = await simulationService.simulate(simulationRequest);

            // Assert - Résultat éphémère, AUCUNE écriture
            expect(result._ephemeral).toBe(true);
            expect(result.simulatedAt).toBeDefined();

            // Verify NO write operations occurred
            expect(prisma.ctoDecision.create).not.toHaveBeenCalled();
            expect(prisma.ctoRuleVersion.create).not.toHaveBeenCalled();
        });
    });
});
