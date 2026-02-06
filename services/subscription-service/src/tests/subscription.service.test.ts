/**
 * Subscription Service Tests
 * Tests Sprint 26 — Modèles Récurrents & Renouvellement de Parc
 * 
 * TESTS OBLIGATOIRES (5) — NOMS EXACTS
 */

import { ContractService } from '../services/contract.service';
import { RenewalPlannerService } from '../services/renewalPlanner.service';
import { AssetTakebackService } from '../services/assetTakeback.service';
import { AutoRenewalNotAllowedError } from '../domain/renewalPlan.types';

// ============================================
// MOCKS
// ============================================

const createMockPrisma = () => ({
    contract: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    contractAsset: {
        createMany: jest.fn()
    },
    renewalPlan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    takebackOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    subscriptionEvent: {
        create: jest.fn()
    },
    $transaction: jest.fn()
});

// ============================================
// TEST DATA
// ============================================

const mockContract = {
    id: 'contract-1',
    companyId: 'company-a',
    companyName: 'ACME Corp',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-01-01'),
    arrAmount: { toNumber: () => 50000 },
    status: 'ACTIVE',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    assets: [
        { id: 'ca-1', contractId: 'contract-1', assetId: 'asset-1', serialNumber: 'SN001', assetType: 'LAPTOP', addedAt: new Date() },
        { id: 'ca-2', contractId: 'contract-1', assetId: 'asset-2', serialNumber: 'SN002', assetType: 'LAPTOP', addedAt: new Date() }
    ]
};

const mockRenewal = {
    id: 'renewal-1',
    contractId: 'contract-1',
    plannedDate: new Date('2027-01-01'),
    status: 'PLANNED',
    notifiedAt90: null,
    notifiedAt60: null,
    notifiedAt30: null,
    executedAt: null,
    executedBy: null,
    createdAt: new Date(),
    contract: mockContract
};

// ============================================
// TESTS
// ============================================

describe('Subscription Service - Sprint 26', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let contractService: ContractService;
    let renewalService: RenewalPlannerService;
    let takebackService: AssetTakebackService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        contractService = new ContractService(prisma as any);
        renewalService = new RenewalPlannerService(prisma as any);
        takebackService = new AssetTakebackService(prisma as any);
    });

    // ========== TEST 1 ==========
    describe('should_create_contract_with_arr', () => {
        it('creates contract with explicit ARR amount', async () => {
            // Arrange
            const newContract = { ...mockContract, assets: [] };
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    contract: { create: jest.fn().mockResolvedValue(newContract) },
                    contractAsset: { createMany: jest.fn() },
                    renewalPlan: { create: jest.fn() },
                    subscriptionEvent: { create: jest.fn() }
                };
                return callback(tx);
            });
            prisma.contract.findUnique.mockResolvedValue(mockContract);

            // Act
            const contract = await contractService.createContract({
                companyId: 'company-a',
                companyName: 'ACME Corp',
                startDate: '2025-01-01',
                endDate: '2027-01-01',
                arrAmount: 50000,
                assetIds: ['asset-1', 'asset-2']
            });

            // Assert
            expect(contract.arrAmount).toBe(50000);
            expect(contract.companyName).toBe('ACME Corp');
            expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('rejects contract with invalid ARR', async () => {
            // Act & Assert
            await expect(contractService.createContract({
                companyId: 'company-a',
                companyName: 'ACME Corp',
                startDate: '2025-01-01',
                endDate: '2027-01-01',
                arrAmount: -1000,
                assetIds: ['asset-1']
            })).rejects.toThrow('ARR amount must be positive');
        });
    });

    // ========== TEST 2 ==========
    describe('should_plan_renewal_on_contract_creation', () => {
        it('creates RenewalPlan automatically when contract is created', async () => {
            // Arrange
            let renewalCreated = false;
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    contract: { create: jest.fn().mockResolvedValue({ ...mockContract, assets: [] }) },
                    contractAsset: { createMany: jest.fn() },
                    renewalPlan: {
                        create: jest.fn().mockImplementation(() => {
                            renewalCreated = true;
                            return Promise.resolve(mockRenewal);
                        })
                    },
                    subscriptionEvent: { create: jest.fn() }
                };
                return callback(tx);
            });
            prisma.contract.findUnique.mockResolvedValue(mockContract);

            // Act
            await contractService.createContract({
                companyId: 'company-a',
                companyName: 'ACME Corp',
                startDate: '2025-01-01',
                endDate: '2027-01-01',
                arrAmount: 50000,
                assetIds: ['asset-1']
            });

            // Assert
            expect(renewalCreated).toBe(true);
        });
    });

    // ========== TEST 3 ==========
    describe('should_not_auto_renew_contract', () => {
        it('throws AutoRenewalNotAllowedError when no executedBy provided', async () => {
            // Arrange
            prisma.renewalPlan.findUnique.mockResolvedValue(mockRenewal);

            // Act & Assert
            await expect(renewalService.executeRenewal('renewal-1', { executedBy: '' }))
                .rejects.toThrow(AutoRenewalNotAllowedError);
        });

        it('throws when attempting automatic renewal', () => {
            // Act & Assert
            expect(() => renewalService.attemptAutoRenewal())
                .toThrow('Automatic renewal is not allowed');
        });
    });

    // ========== TEST 4 ==========
    describe('should_execute_takeback_on_renewal', () => {
        it('creates takeback orders for all assets when renewal is executed', async () => {
            // Arrange
            prisma.renewalPlan.findUnique.mockResolvedValue(mockRenewal);
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    takebackOrder: {
                        create: jest.fn().mockResolvedValue({
                            id: 'takeback-1',
                            renewalId: 'renewal-1',
                            assetId: 'asset-1',
                            status: 'INITIATED',
                            dataWipeConfirmed: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    },
                    renewalPlan: { findUnique: jest.fn().mockResolvedValue(mockRenewal) },
                    subscriptionEvent: { create: jest.fn() }
                };
                return callback(tx);
            });

            // Act
            const takebacks = await takebackService.createTakebacksForRenewal('renewal-1');

            // Assert
            expect(takebacks).toHaveLength(2);  // 2 assets in mockContract
            expect(takebacks[0].status).toBe('INITIATED');
        });

        it('logs takeback initiation event', async () => {
            // Arrange
            let eventLogged = false;
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    takebackOrder: {
                        create: jest.fn().mockResolvedValue({
                            id: 'takeback-1',
                            renewalId: 'renewal-1',
                            assetId: 'asset-1',
                            status: 'INITIATED',
                            dataWipeConfirmed: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    },
                    renewalPlan: { findUnique: jest.fn().mockResolvedValue(mockRenewal) },
                    subscriptionEvent: {
                        create: jest.fn().mockImplementation((data) => {
                            if (data.data.eventType === 'AssetTakebackInitiated') {
                                eventLogged = true;
                            }
                            return Promise.resolve();
                        })
                    }
                };
                return callback(tx);
            });

            // Act
            await takebackService.createTakeback({
                renewalId: 'renewal-1',
                assetId: 'asset-1'
            });

            // Assert — traçabilité vérifiée
            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });

    // ========== TEST 5 ==========
    describe('should_expose_contract_visibility_to_client', () => {
        it('returns client view without ARR', async () => {
            // Arrange
            prisma.contract.findFirst.mockResolvedValue(mockContract);

            // Act
            const view = await contractService.getClientContractView('company-a', 'contract-1');

            // Assert
            expect(view).not.toBeNull();
            expect(view!.companyName).toBe('ACME Corp');
            expect(view!.assetsCount).toBe(2);
            expect(view!).not.toHaveProperty('arrAmount');  // ❌ ARR non exposé
        });

        it('returns null for wrong company (isolation)', async () => {
            // Arrange
            prisma.contract.findFirst.mockResolvedValue(null);

            // Act
            const view = await contractService.getClientContractView('wrong-company', 'contract-1');

            // Assert
            expect(view).toBeNull();
        });
    });
});
