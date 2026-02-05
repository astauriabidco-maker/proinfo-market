/**
 * WMS Service Tests
 * Tests unitaires pour le WMS Service
 */

import { WmsService } from '../services/wms.service';
import { InventoryServiceClient, ReservationResponse, MovementResponse } from '../integrations/inventory.client';
import { AssetServiceClient, AssetServiceResponse } from '../integrations/asset.client';
import {
    AssetNotReservedForPickingError
} from '../domain/picking.types';
import {
    PickingNotCompletedError
} from '../domain/shipment.types';
import { PrismaClient, PickingStatus, AssemblyStatus, ShipmentStatus, ReturnStatus } from '@prisma/client';

// Mock du PrismaClient
const mockPrisma = {
    pickingOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    },
    assemblyOrder: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    },
    shipment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    },
    return: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    }
} as unknown as PrismaClient;

// Mock des clients
const mockInventoryClient: InventoryServiceClient = {
    getReservation: jest.fn(),
    moveAsset: jest.fn()
};

const mockAssetClient: AssetServiceClient = {
    getAsset: jest.fn(),
    changeStatus: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('WmsService', () => {
    let service: WmsService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new WmsService(mockPrisma, mockInventoryClient, mockAssetClient);
    });

    describe('Picking', () => {
        test('should_create_picking_order_only_if_asset_reserved', async () => {
            // Arrange - Asset réservé
            const mockReservation: ReservationResponse = {
                id: 'res-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'ORDER-001',
                createdAt: '2026-01-01T00:00:00Z'
            };
            (mockInventoryClient.getReservation as jest.Mock).mockResolvedValue(mockReservation);
            (mockPrisma.pickingOrder.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.pickingOrder.create as jest.Mock).mockResolvedValue({
                id: 'picking-uuid-1',
                assetId: 'asset-uuid-1',
                status: PickingStatus.PENDING,
                createdAt: new Date()
            });

            // Act
            const picking = await service.createPickingOrder({ assetId: 'asset-uuid-1' });

            // Assert
            expect(picking.assetId).toBe('asset-uuid-1');
            expect(picking.status).toBe(PickingStatus.PENDING);
            expect(mockInventoryClient.getReservation).toHaveBeenCalledWith('asset-uuid-1');
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('PickingCreated')
            );
        });

        test('should_reject_picking_if_not_reserved', async () => {
            // Arrange - Asset PAS réservé
            (mockInventoryClient.getReservation as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.createPickingOrder({ assetId: 'asset-uuid-1' })
            ).rejects.toThrow(AssetNotReservedForPickingError);

            // Vérifier que create n'a pas été appelé
            expect(mockPrisma.pickingOrder.create).not.toHaveBeenCalled();
        });

        test('should_complete_picking_and_move_inventory', async () => {
            // Arrange
            const mockPicking = {
                id: 'picking-uuid-1',
                assetId: 'asset-uuid-1',
                status: PickingStatus.IN_PROGRESS,
                createdAt: new Date()
            };
            (mockPrisma.pickingOrder.findUnique as jest.Mock).mockResolvedValue(mockPicking);
            (mockInventoryClient.moveAsset as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                toLocation: 'SHIPPING_DOCK',
                reason: 'MOVE',
                createdAt: '2026-01-01T00:00:00Z'
            });
            (mockPrisma.pickingOrder.update as jest.Mock).mockResolvedValue({
                ...mockPicking,
                status: PickingStatus.COMPLETED
            });

            // Act
            const completedPicking = await service.completePicking('picking-uuid-1');

            // Assert
            expect(completedPicking.status).toBe(PickingStatus.COMPLETED);
            expect(mockInventoryClient.moveAsset).toHaveBeenCalledWith(
                'asset-uuid-1',
                'SHIPPING_DOCK',
                'MOVE'
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('PickingCompleted')
            );
        });
    });

    describe('Assembly', () => {
        test('should_execute_assembly_tasks', async () => {
            // Arrange
            const tasks = ['INSTALL_CPU', 'INSTALL_RAM', 'INSTALL_SSD', 'RUN_QA'];
            const mockAssembly = {
                id: 'assembly-uuid-1',
                assetId: 'asset-uuid-1',
                tasks: JSON.stringify(tasks),
                status: AssemblyStatus.IN_PROGRESS,
                createdAt: new Date()
            };
            (mockPrisma.assemblyOrder.create as jest.Mock).mockResolvedValue({
                ...mockAssembly,
                status: AssemblyStatus.PENDING
            });
            (mockPrisma.assemblyOrder.findUnique as jest.Mock).mockResolvedValue(mockAssembly);
            (mockPrisma.assemblyOrder.update as jest.Mock).mockResolvedValue({
                ...mockAssembly,
                status: AssemblyStatus.COMPLETED
            });

            // Act - Créer l'assemblage
            const assembly = await service.createAssemblyOrder({
                assetId: 'asset-uuid-1',
                tasks
            });
            expect(assembly.assetId).toBe('asset-uuid-1');

            // Act - Compléter l'assemblage
            const completedAssembly = await service.completeAssembly('assembly-uuid-1');

            // Assert
            expect(completedAssembly.status).toBe(AssemblyStatus.COMPLETED);
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssemblyCompleted')
            );
        });
    });

    describe('Shipment', () => {
        test('should_ship_asset_only_after_picking_and_assembly', async () => {
            // Arrange - Picking complété
            const mockCompletedPicking = {
                id: 'picking-uuid-1',
                assetId: 'asset-uuid-1',
                status: PickingStatus.COMPLETED,
                createdAt: new Date()
            };
            // Pas d'assemblage actif (donc OK)
            (mockPrisma.pickingOrder.findFirst as jest.Mock).mockImplementation(({ where }) => {
                if (where?.status === PickingStatus.COMPLETED) {
                    return Promise.resolve(mockCompletedPicking);
                }
                return Promise.resolve(null);
            });
            (mockPrisma.assemblyOrder.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.shipment.create as jest.Mock).mockResolvedValue({
                id: 'shipment-uuid-1',
                assetId: 'asset-uuid-1',
                carrier: 'DHL',
                trackingRef: null,
                status: ShipmentStatus.READY,
                createdAt: new Date()
            });
            (mockInventoryClient.moveAsset as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                toLocation: 'SHIPPING_DOCK',
                reason: 'SHIP',
                createdAt: '2026-01-01T00:00:00Z'
            });
            (mockAssetClient.changeStatus as jest.Mock).mockResolvedValue({
                id: 'asset-uuid-1',
                status: 'SOLD'
            });
            (mockPrisma.shipment.update as jest.Mock).mockResolvedValue({
                id: 'shipment-uuid-1',
                assetId: 'asset-uuid-1',
                carrier: 'DHL',
                trackingRef: null,
                status: ShipmentStatus.SHIPPED,
                createdAt: new Date()
            });

            // Act
            const shipment = await service.createShipment({
                assetId: 'asset-uuid-1',
                carrier: 'DHL'
            });

            // Assert
            expect(shipment.status).toBe(ShipmentStatus.SHIPPED);
            expect(mockAssetClient.changeStatus).toHaveBeenCalledWith(
                'asset-uuid-1',
                'SOLD',
                'Shipped via WMS'
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetShipped')
            );
        });

        test('should_reject_shipment_if_picking_not_completed', async () => {
            // Arrange - Pas de picking complété
            (mockPrisma.pickingOrder.findFirst as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.createShipment({ assetId: 'asset-uuid-1', carrier: 'DHL' })
            ).rejects.toThrow(PickingNotCompletedError);

            // Vérifier que create n'a pas été appelé
            expect(mockPrisma.shipment.create).not.toHaveBeenCalled();
        });
    });

    describe('Return', () => {
        test('should_process_asset_return', async () => {
            // Arrange
            (mockAssetClient.changeStatus as jest.Mock).mockResolvedValue({
                id: 'asset-uuid-1',
                status: 'RMA'
            });
            (mockInventoryClient.moveAsset as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                toLocation: 'RECEIVING_DOCK',
                reason: 'RETURN',
                createdAt: '2026-01-01T00:00:00Z'
            });
            (mockPrisma.return.create as jest.Mock).mockResolvedValue({
                id: 'return-uuid-1',
                assetId: 'asset-uuid-1',
                reason: 'DOA',
                status: ReturnStatus.RECEIVED,
                createdAt: new Date()
            });

            // Act
            const ret = await service.processReturn({
                assetId: 'asset-uuid-1',
                reason: 'DOA'
            });

            // Assert
            expect(ret.status).toBe(ReturnStatus.RECEIVED);
            expect(ret.reason).toBe('DOA');
            expect(mockAssetClient.changeStatus).toHaveBeenCalledWith(
                'asset-uuid-1',
                'RMA',
                'Return: DOA'
            );
            expect(mockInventoryClient.moveAsset).toHaveBeenCalledWith(
                'asset-uuid-1',
                'RECEIVING_DOCK',
                'RETURN'
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetReturned')
            );
        });
    });
});
