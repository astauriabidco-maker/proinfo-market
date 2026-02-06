/**
 * Routing Service Tests
 * Tests unitaires pour le service de routage multi-entrepôts
 * 
 * RÈGLE : Ces tests vérifient que le routage est DÉTERMINISTE
 */

import { StockStatus } from '@prisma/client';
import {
    RoutingService,
    WmsStatusProvider,
    OrderAssignmentStore
} from '../services/routing.service';
import {
    ROUTING_PRIORITY,
    NoWarehouseAvailableError,
    WmsAlreadyStartedError
} from '../domain/warehouse.types';

// Mock du PrismaClient
const mockPrisma = {
    warehouse: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn()
    },
    stockLocation: {
        count: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn()
    }
} as any;

// Mock des providers
const mockWmsProvider: WmsStatusProvider = {
    hasWmsStarted: jest.fn()
};

class MockAssignmentStore implements OrderAssignmentStore {
    private assignments = new Map<string, string>();

    async getAssignment(orderId: string): Promise<string | null> {
        return this.assignments.get(orderId) || null;
    }

    async setAssignment(orderId: string, warehouseId: string): Promise<void> {
        this.assignments.set(orderId, warehouseId);
    }

    clear(): void {
        this.assignments.clear();
    }
}

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('RoutingService', () => {
    let service: RoutingService;
    let mockAssignmentStore: MockAssignmentStore;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAssignmentStore = new MockAssignmentStore();
        service = new RoutingService(mockPrisma, mockWmsProvider, mockAssignmentStore);
    });

    // ============================================
    // TEST 1 : Assignation à un seul entrepôt
    // ============================================

    test('should_assign_order_to_single_warehouse', async () => {
        // Arrange
        const request = {
            orderId: 'order-001',
            customerCountry: 'FR',
            assetIds: ['asset-1', 'asset-2']
        };

        (mockWmsProvider.hasWmsStarted as jest.Mock).mockResolvedValue(false);

        mockPrisma.warehouse.findMany.mockResolvedValue([
            { id: 'wh-1', code: 'FR-PAR-01', name: 'Paris', country: 'FR', active: true },
            { id: 'wh-2', code: 'DE-BER-01', name: 'Berlin', country: 'DE', active: true }
        ]);

        // Les deux assets sont AVAILABLE dans le warehouse FR
        mockPrisma.stockLocation.count.mockImplementation((args: any) => {
            if (args.where.warehouseId === 'wh-1') return Promise.resolve(2);
            return Promise.resolve(0);
        });

        mockPrisma.stockLocation.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-1', code: 'FR-PAR-01' });

        // Act
        const result = await service.assignOrderToWarehouse(request);

        // Assert - UN SEUL warehouse assigné
        expect(result.orderId).toBe('order-001');
        expect(result.assignedWarehouseId).toBe('wh-1');
        expect(result.assignedWarehouseCode).toBe('FR-PAR-01');
        expect(result.assetsReserved).toEqual(['asset-1', 'asset-2']);

        // Vérifier événement
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('WarehouseAssigned')
        );
    });

    // ============================================
    // TEST 2 : Priorité stock AVAILABLE
    // ============================================

    test('should_prioritize_available_stock', async () => {
        // Arrange - Deux warehouses, un avec stock complet
        const request = {
            orderId: 'order-002',
            customerCountry: 'FR',
            assetIds: ['asset-1', 'asset-2', 'asset-3']
        };

        (mockWmsProvider.hasWmsStarted as jest.Mock).mockResolvedValue(false);

        mockPrisma.warehouse.findMany.mockResolvedValue([
            { id: 'wh-partial', code: 'FR-LYO-01', name: 'Lyon', country: 'FR', active: true },
            { id: 'wh-full', code: 'FR-PAR-01', name: 'Paris', country: 'FR', active: true }
        ]);

        // Lyon a seulement 2/3, Paris a 3/3
        mockPrisma.stockLocation.count.mockImplementation((args: any) => {
            if (args.where.warehouseId === 'wh-partial') return Promise.resolve(2);  // Partiel
            if (args.where.warehouseId === 'wh-full') return Promise.resolve(3);      // Complet
            return Promise.resolve(0);
        });

        mockPrisma.stockLocation.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-full', code: 'FR-PAR-01' });

        // Act
        const result = await service.assignOrderToWarehouse(request);

        // Assert - Priorise le stock COMPLET
        expect(result.assignedWarehouseId).toBe('wh-full');
        expect(result.assignedWarehouseCode).toBe('FR-PAR-01');
    });

    // ============================================
    // TEST 3 : Blocage si aucun entrepôt disponible
    // ============================================

    test('should_block_order_when_no_warehouse_available', async () => {
        // Arrange - Aucun warehouse avec stock complet
        const request = {
            orderId: 'order-003',
            customerCountry: 'FR',
            assetIds: ['asset-1', 'asset-2']
        };

        (mockWmsProvider.hasWmsStarted as jest.Mock).mockResolvedValue(false);

        mockPrisma.warehouse.findMany.mockResolvedValue([
            { id: 'wh-1', code: 'FR-PAR-01', name: 'Paris', country: 'FR', active: true }
        ]);

        // Aucun asset disponible
        mockPrisma.stockLocation.count.mockResolvedValue(0);

        // Act & Assert
        await expect(service.assignOrderToWarehouse(request))
            .rejects
            .toThrow(NoWarehouseAvailableError);

        // Vérifier événement d'échec
        expect(console.log).toHaveBeenCalledWith(
            '[EVENT]',
            expect.stringContaining('RoutingFailed')
        );
    });

    // ============================================
    // TEST 4 : Pas de réassignation après WMS start
    // ============================================

    test('should_not_reassign_after_wms_start', async () => {
        // Arrange - WMS déjà démarré
        const request = {
            orderId: 'order-004',
            customerCountry: 'FR',
            assetIds: ['asset-1']
        };

        // WMS a déjà démarré pour cette commande
        (mockWmsProvider.hasWmsStarted as jest.Mock).mockResolvedValue(true);

        // Act & Assert
        await expect(service.assignOrderToWarehouse(request))
            .rejects
            .toThrow(WmsAlreadyStartedError);

        // Vérifier qu'aucune opération DB n'a été faite
        expect(mockPrisma.stockLocation.updateMany).not.toHaveBeenCalled();
    });

    // ============================================
    // TEST 5 : Priorité pays client
    // ============================================

    test('should_respect_country_priority', async () => {
        // Arrange - Client FR, deux warehouses FR et DE
        const request = {
            orderId: 'order-005',
            customerCountry: 'FR',
            assetIds: ['asset-1']
        };

        (mockWmsProvider.hasWmsStarted as jest.Mock).mockResolvedValue(false);

        mockPrisma.warehouse.findMany.mockResolvedValue([
            { id: 'wh-de', code: 'DE-BER-01', name: 'Berlin', country: 'DE', active: true },
            { id: 'wh-fr', code: 'FR-PAR-01', name: 'Paris', country: 'FR', active: true }
        ]);

        // Les deux ont le stock complet
        mockPrisma.stockLocation.count.mockResolvedValue(1);
        mockPrisma.stockLocation.updateMany.mockResolvedValue({ count: 1 });
        mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 'wh-fr', code: 'FR-PAR-01' });

        // Act
        const result = await service.assignOrderToWarehouse(request);

        // Assert - Priorise le même pays que le client
        expect(result.assignedWarehouseId).toBe('wh-fr');
        expect(result.assignedWarehouseCode).toBe('FR-PAR-01');

        // Le warehouse FR a reçu +10 points de priorité pays
        // Le warehouse DE n'a pas ce bonus
    });
});
