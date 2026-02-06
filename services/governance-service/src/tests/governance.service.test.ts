/**
 * Governance Service Tests
 * Tests Sprint 27 — Scalabilité Organisationnelle & Gouvernance Interne
 * 
 * TESTS OBLIGATOIRES (5) — NOMS EXACTS
 */

import { PermissionService } from '../services/permission.service';
import { DelegationService } from '../services/delegation.service';
import { DecisionLogService } from '../services/decisionLog.service';
import { PermissionDeniedError, UnauthorizedOverrideError } from '../domain/permission.types';
import { CannotDelegateError } from '../domain/delegation.types';

// ============================================
// MOCKS
// ============================================

const createMockPrisma = () => ({
    userRole: {
        findMany: jest.fn()
    },
    delegation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    },
    permission: {
        findUnique: jest.fn()
    },
    decisionLog: {
        create: jest.fn(),
        findMany: jest.fn()
    },
    governanceEvent: {
        create: jest.fn()
    },
    $transaction: jest.fn()
});

// ============================================
// TEST DATA
// ============================================

const mockUserWithPermission = [
    {
        userId: 'user-1',
        role: {
            id: 'role-1',
            name: 'manager',
            permissions: [
                { permission: { id: 'perm-1', code: 'APPROVE_RMA' } }
            ]
        }
    }
];

const mockUserWithoutPermission = [
    {
        userId: 'user-2',
        role: {
            id: 'role-2',
            name: 'operator',
            permissions: []
        }
    }
];

const mockActiveDelegation = {
    id: 'deleg-1',
    fromUserId: 'user-1',
    toUserId: 'user-3',
    permissionId: 'perm-1',
    active: true,
    expiresAt: new Date(Date.now() + 86400000),  // Tomorrow
    permission: { code: 'APPROVE_RMA' }
};

const mockExpiredDelegation = {
    id: 'deleg-2',
    fromUserId: 'user-1',
    toUserId: 'user-4',
    permissionId: 'perm-1',
    active: true,
    expiresAt: new Date(Date.now() - 86400000),  // Yesterday
    permission: { code: 'APPROVE_RMA' }
};

// ============================================
// TESTS
// ============================================

describe('Governance Service - Sprint 27', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let permissionService: PermissionService;
    let delegationService: DelegationService;
    let decisionLogService: DecisionLogService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        decisionLogService = new DecisionLogService(prisma as any);
        permissionService = new PermissionService(prisma as any, decisionLogService);
        delegationService = new DelegationService(prisma as any);
    });

    // ========== TEST 1 ==========
    describe('should_enforce_permission_on_critical_action', () => {
        it('blocks action when permission is missing', async () => {
            // Arrange
            prisma.userRole.findMany.mockResolvedValue(mockUserWithoutPermission);
            prisma.delegation.findFirst.mockResolvedValue(null);

            // Act & Assert
            await expect(
                permissionService.requirePermission('user-2', 'APPROVE_RMA')
            ).rejects.toThrow(PermissionDeniedError);
        });

        it('allows action when permission is granted via role', async () => {
            // Arrange
            prisma.userRole.findMany.mockResolvedValue(mockUserWithPermission);
            prisma.decisionLog.create.mockResolvedValue({ id: 'log-1' });
            prisma.governanceEvent.create.mockResolvedValue({});

            // Act
            const result = await permissionService.requirePermission('user-1', 'APPROVE_RMA');

            // Assert
            expect(result.allowed).toBe(true);
            expect(result.delegatedBy).toBeUndefined();
        });
    });

    // ========== TEST 2 ==========
    describe('should_allow_temporary_delegation', () => {
        it('creates delegation with expiration', async () => {
            // Arrange
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days
            prisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'APPROVE_RMA' });
            prisma.userRole.findMany.mockResolvedValue(mockUserWithPermission);
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    delegation: {
                        create: jest.fn().mockResolvedValue({
                            ...mockActiveDelegation,
                            expiresAt,
                            createdAt: new Date(),
                            permission: { code: 'APPROVE_RMA' }
                        })
                    },
                    governanceEvent: { create: jest.fn() }
                };
                return callback(tx);
            });

            // Act
            const delegation = await delegationService.createDelegation({
                fromUserId: 'user-1',
                toUserId: 'user-3',
                permissionCode: 'APPROVE_RMA',
                reason: 'Vacation coverage',
                expiresAt: expiresAt.toISOString()
            });

            // Assert
            expect(delegation.active).toBe(true);
            expect(delegation.permissionCode).toBe('APPROVE_RMA');
        });

        it('allows delegated user to use permission', async () => {
            // Arrange
            prisma.userRole.findMany.mockResolvedValue([]);  // No direct permission
            prisma.delegation.findFirst.mockResolvedValue(mockActiveDelegation);
            prisma.decisionLog.create.mockResolvedValue({ id: 'log-1' });
            prisma.governanceEvent.create.mockResolvedValue({});

            // Act
            const result = await permissionService.requirePermission('user-3', 'APPROVE_RMA');

            // Assert
            expect(result.allowed).toBe(true);
            expect(result.delegatedBy).toBe('user-1');
        });
    });

    // ========== TEST 3 ==========
    describe('should_expire_delegation_automatically', () => {
        it('identifies expired delegations', () => {
            // Act
            const isExpired = delegationService.isDelegationExpired({
                ...mockExpiredDelegation,
                reason: null,
                revokedAt: null,
                revokedBy: null,
                createdAt: new Date()
            });

            // Assert
            expect(isExpired).toBe(true);
        });

        it('expires delegations past their expiration date', async () => {
            // Arrange
            prisma.delegation.findMany.mockResolvedValue([mockExpiredDelegation]);
            prisma.$transaction.mockImplementation(async (callback: any) => {
                const tx = {
                    delegation: { update: jest.fn() },
                    governanceEvent: { create: jest.fn() }
                };
                return callback(tx);
            });

            // Act
            const count = await delegationService.expireExpiredDelegations();

            // Assert
            expect(count).toBe(1);
        });

        it('does not allow expired delegation to grant permission', async () => {
            // Arrange
            prisma.userRole.findMany.mockResolvedValue([]);
            prisma.delegation.findFirst.mockResolvedValue(null);  // Expired = not found

            // Act & Assert
            await expect(
                permissionService.requirePermission('user-4', 'APPROVE_RMA')
            ).rejects.toThrow(PermissionDeniedError);
        });
    });

    // ========== TEST 4 ==========
    describe('should_log_human_decision', () => {
        it('creates append-only decision log', async () => {
            // Arrange
            const mockLog = {
                id: 'log-1',
                actorId: 'user-1',
                actorName: 'John Doe',
                action: 'APPROVE_RMA',
                entityType: 'RMA',
                entityId: 'rma-123',
                context: JSON.stringify({ reason: 'Customer request' }),
                delegatedBy: null,
                createdAt: new Date()
            };
            prisma.decisionLog.create.mockResolvedValue(mockLog);
            prisma.governanceEvent.create.mockResolvedValue({});

            // Act
            const log = await decisionLogService.logDecision({
                actorId: 'user-1',
                actorName: 'John Doe',
                action: 'APPROVE_RMA',
                entityType: 'RMA',
                entityId: 'rma-123',
                context: { reason: 'Customer request' }
            });

            // Assert
            expect(log.actorId).toBe('user-1');
            expect(log.action).toBe('APPROVE_RMA');
            expect(prisma.decisionLog.create).toHaveBeenCalled();
        });

        it('logs delegation source when action is delegated', async () => {
            // Arrange
            const mockLog = {
                id: 'log-2',
                actorId: 'user-3',
                actorName: 'Jane Doe',
                action: 'APPROVE_RMA',
                entityType: 'RMA',
                entityId: 'rma-456',
                context: null,
                delegatedBy: 'user-1',
                createdAt: new Date()
            };
            prisma.decisionLog.create.mockResolvedValue(mockLog);
            prisma.governanceEvent.create.mockResolvedValue({});

            // Act
            const log = await decisionLogService.logDecision({
                actorId: 'user-3',
                action: 'APPROVE_RMA',
                delegatedBy: 'user-1'
            });

            // Assert
            expect(log.delegatedBy).toBe('user-1');
        });
    });

    // ========== TEST 5 ==========
    describe('should_not_allow_unauthorized_override', () => {
        it('throws UnauthorizedOverrideError on bypass attempt', () => {
            // Act & Assert
            expect(() => permissionService.attemptOverride())
                .toThrow(UnauthorizedOverrideError);
            expect(() => permissionService.attemptOverride())
                .toThrow('Unauthorized override attempt');
        });

        it('cannot delegate permission you do not have', async () => {
            // Arrange
            prisma.permission.findUnique.mockResolvedValue({ id: 'perm-1', code: 'MANAGE_ROLES' });
            prisma.userRole.findMany.mockResolvedValue(mockUserWithoutPermission);  // No permission

            // Act & Assert
            await expect(
                delegationService.createDelegation({
                    fromUserId: 'user-2',
                    toUserId: 'user-3',
                    permissionCode: 'MANAGE_ROLES'
                })
            ).rejects.toThrow(CannotDelegateError);
        });
    });
});
