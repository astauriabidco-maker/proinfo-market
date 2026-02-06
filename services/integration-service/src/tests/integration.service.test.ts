/**
 * Integration Service Tests
 * Tests Sprint 25 — Intégrations Clients & Lock-in Propre
 * 
 * TESTS OBLIGATOIRES (5) — NOMS EXACTS
 * 
 * Corrections appliquées :
 * - Pas de lock-in artificiel (rate limit en mémoire supprimé)
 * - Traçabilité complète des webhooks (WebhookDispatchLog)
 */

import { ApiGatewayService } from '../services/apiGateway.service';
import { WebhookDispatcherService } from '../services/webhookDispatcher.service';
import {
    ForbiddenError,
    TenantIsolationError,
    UnauthorizedError
} from '../domain/apiContract.types';

// ============================================
// MOCKS
// ============================================

const createMockPrisma = () => ({
    apiClient: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn()
    },
    apiAccessLog: {
        create: jest.fn()
    },
    webhookSubscription: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    },
    webhookDispatchLog: {
        create: jest.fn()
    }
});

// ============================================
// TEST DATA
// ============================================

const mockClientA = {
    id: 'client-a',
    name: 'ACME Corp',
    companyId: 'company-a',
    apiKey: 'pim_test_key_a',
    scopes: 'read:assets,read:rse',
    active: true,
    rateLimit: 1000,
    createdAt: new Date(),
    lastAccess: null
};

const mockClientWithWrite = {
    id: 'client-c',
    name: 'Full Corp',
    companyId: 'company-c',
    apiKey: 'pim_test_key_c',
    scopes: 'read:assets,write:sav',
    active: true,
    rateLimit: 1000,
    createdAt: new Date(),
    lastAccess: null
};

// ============================================
// TESTS
// ============================================

describe('Integration Service - Sprint 25', () => {
    let prisma: ReturnType<typeof createMockPrisma>;
    let gateway: ApiGatewayService;
    let webhookService: WebhookDispatcherService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = createMockPrisma();
        gateway = new ApiGatewayService(prisma as any);
        webhookService = new WebhookDispatcherService(prisma as any);
    });

    // ========== TEST 1 ==========
    describe('should_enforce_api_scope_access', () => {
        it('blocks access when required scope is missing', async () => {
            // Arrange
            prisma.apiClient.findUnique.mockResolvedValue(mockClientA);
            prisma.apiClient.update.mockResolvedValue(mockClientA);

            // Client A has read:assets, read:rse but NOT write:sav
            const client = await gateway.authenticate('pim_test_key_a');

            // Act & Assert — write:sav should fail
            expect(() => gateway.requireScope(client, 'write:sav')).toThrow(ForbiddenError);
            expect(() => gateway.requireScope(client, 'write:sav')).toThrow('Missing required scope: write:sav');

            // read:assets should succeed
            expect(() => gateway.requireScope(client, 'read:assets')).not.toThrow();
            expect(() => gateway.requireScope(client, 'read:rse')).not.toThrow();
        });
    });

    // ========== TEST 2 ==========
    describe('should_isolate_client_data', () => {
        it('prevents cross-tenant access', async () => {
            // Arrange
            prisma.apiClient.findUnique.mockResolvedValue(mockClientA);
            prisma.apiClient.update.mockResolvedValue(mockClientA);

            // Client A belongs to company-a
            const clientA = await gateway.authenticate('pim_test_key_a');

            // Act & Assert — Accessing company-b data should fail
            expect(() => gateway.enforceTenantIsolation(clientA, 'company-b'))
                .toThrow(TenantIsolationError);
            expect(() => gateway.enforceTenantIsolation(clientA, 'company-b'))
                .toThrow('Cross-tenant access denied');

            // Accessing own company should succeed
            expect(() => gateway.enforceTenantIsolation(clientA, 'company-a')).not.toThrow();
        });
    });

    // ========== TEST 3 ==========
    describe('should_version_api_without_breaking_v1', () => {
        it('maintains v1 API contract structure', async () => {
            // This test verifies the API contract constants are stable
            const { API_VERSION } = require('../domain/apiContract.types');

            // Assert — API version v1 exists
            expect(API_VERSION).toBe('v1');

            // Assert — Scopes are defined
            const { SCOPE_DESCRIPTIONS } = require('../domain/apiContract.types');
            expect(SCOPE_DESCRIPTIONS).toHaveProperty('read:assets');
            expect(SCOPE_DESCRIPTIONS).toHaveProperty('read:rse');
            expect(SCOPE_DESCRIPTIONS).toHaveProperty('write:sav');

            // Assert — Webhook events are defined
            const { EVENT_DESCRIPTIONS } = require('../domain/webhook.types');
            expect(EVENT_DESCRIPTIONS).toHaveProperty('ASSET_SHIPPED');
            expect(EVENT_DESCRIPTIONS).toHaveProperty('RMA_CREATED');
            expect(EVENT_DESCRIPTIONS).toHaveProperty('RMA_RESOLVED');
            expect(EVENT_DESCRIPTIONS).toHaveProperty('INVOICE_ISSUED');
        });
    });

    // ========== TEST 4 ==========
    describe('should_dispatch_webhook_on_event', () => {
        it('dispatches webhook with HMAC signature and LOGS EACH ATTEMPT', async () => {
            // Arrange
            const mockSubscription = {
                id: 'sub-1',
                companyId: 'company-a',
                event: 'ASSET_SHIPPED',
                targetUrl: 'https://webhook.test/callback',
                secret: 'test_secret_123',
                active: true,
                failCount: 0,
                createdAt: new Date()
            };

            prisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
            prisma.webhookSubscription.update.mockResolvedValue(mockSubscription);
            prisma.webhookDispatchLog.create.mockResolvedValue({});

            // Mock fetch
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                status: 200
            });

            // Act
            const results = await webhookService.dispatch('company-a', 'ASSET_SHIPPED', {
                assetId: 'asset-123',
                trackingNumber: 'TRACK-001'
            });

            // Assert
            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
            expect(global.fetch).toHaveBeenCalled();

            // TRAÇABILITÉ : Vérifier que le dispatch a été loggé
            expect(prisma.webhookDispatchLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    subscriptionId: 'sub-1',
                    companyId: 'company-a',
                    event: 'ASSET_SHIPPED',
                    attempt: 1,
                    success: true,
                    statusCode: 200,
                    payloadHash: expect.any(String)
                })
            });

            // Verify HMAC header was included
            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            expect(fetchCall[1].headers['X-Webhook-Signature']).toMatch(/^sha256=/);
        });

        it('verifies HMAC signature correctly', () => {
            const payload = '{"event":"ASSET_SHIPPED","data":{}}';
            const secret = 'test_secret';

            const signature = webhookService.signPayload(payload, secret);
            const isValid = webhookService.verifySignature(payload, `sha256=${signature}`, secret);

            expect(isValid).toBe(true);
        });

        it('logs failed attempts with error details', async () => {
            // Arrange
            const mockSubscription = {
                id: 'sub-1',
                companyId: 'company-a',
                event: 'ASSET_SHIPPED',
                targetUrl: 'https://webhook.test/callback',
                secret: 'test_secret_123',
                active: true,
                failCount: 0,
                createdAt: new Date()
            };

            prisma.webhookSubscription.findMany.mockResolvedValue([mockSubscription]);
            prisma.webhookSubscription.update.mockResolvedValue({ ...mockSubscription, failCount: 1 });
            prisma.webhookDispatchLog.create.mockResolvedValue({});

            // Mock fetch to fail
            global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

            // Act
            const results = await webhookService.dispatch('company-a', 'ASSET_SHIPPED', {
                assetId: 'asset-123'
            });

            // Assert
            expect(results[0].success).toBe(false);
            expect(results[0].error).toBe('Connection refused');

            // TRAÇABILITÉ : Chaque tentative loggée avec erreur
            expect(prisma.webhookDispatchLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    success: false,
                    errorMessage: 'Connection refused'
                })
            });
        }, 60000);  // 60s timeout pour les retries
    });

    // ========== TEST 5 ==========
    describe('should_not_allow_unauthorized_writes', () => {
        it('rejects write operations without proper scope', async () => {
            // Arrange — Client with only read scopes
            prisma.apiClient.findUnique.mockResolvedValue(mockClientA);
            prisma.apiClient.update.mockResolvedValue(mockClientA);

            const readOnlyClient = await gateway.authenticate('pim_test_key_a');

            // Assert — Only has read scopes
            expect(readOnlyClient.scopes).toContain('read:assets');
            expect(readOnlyClient.scopes).toContain('read:rse');
            expect(readOnlyClient.scopes).not.toContain('write:sav');
            expect(readOnlyClient.scopes).not.toContain('write:receiving');

            // Act & Assert — Write attempts should fail
            expect(() => gateway.requireScope(readOnlyClient, 'write:sav'))
                .toThrow(ForbiddenError);
            expect(() => gateway.requireScope(readOnlyClient, 'write:receiving'))
                .toThrow(ForbiddenError);
        });

        it('allows write operations with proper scope', async () => {
            // Arrange — Client with write scope
            prisma.apiClient.findUnique.mockResolvedValue(mockClientWithWrite);
            prisma.apiClient.update.mockResolvedValue(mockClientWithWrite);

            const writeClient = await gateway.authenticate('pim_test_key_c');

            // Assert — Has write:sav scope
            expect(writeClient.scopes).toContain('write:sav');

            // Act & Assert — write:sav should succeed
            expect(() => gateway.requireScope(writeClient, 'write:sav')).not.toThrow();

            // But write:receiving still fails
            expect(() => gateway.requireScope(writeClient, 'write:receiving'))
                .toThrow(ForbiddenError);
        });
    });
});
