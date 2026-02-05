/**
 * Inventory Service Tests
 * Tests unitaires pour le Inventory Service
 */

import { InventoryService } from '../services/inventory.service';
import { AssetServiceClient, AssetServiceResponse } from '../integrations/asset.client';
import {
    AssetAlreadyReservedError,
    AssetNotReservedError,
    AssetNotSellableError
} from '../domain/reservation.types';
import { MovementReason, LocationType, PrismaClient } from '@prisma/client';

// Mock du PrismaClient
const mockPrisma = {
    warehouse: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
    },
    location: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    inventoryMovement: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    inventoryReservation: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

// Mock du client Asset Service
const mockAssetServiceClient: AssetServiceClient = {
    getAsset: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('InventoryService', () => {
    let service: InventoryService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new InventoryService(mockPrisma, mockAssetServiceClient);
    });

    describe('Movements', () => {
        const mockLocation = {
            id: 'loc-uuid-1',
            warehouseId: 'wh-uuid-1',
            code: 'A-01-01',
            type: LocationType.STORAGE,
            createdAt: new Date()
        };

        test('should_move_asset_and_record_movement', async () => {
            // Arrange
            (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue(mockLocation);
            (mockPrisma.inventoryMovement.create as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                fromLocation: null,
                toLocation: 'loc-uuid-1',
                reason: MovementReason.INTAKE,
                createdAt: new Date()
            });

            // Act
            const movement = await service.moveAsset('asset-uuid-1', {
                toLocation: 'loc-uuid-1',
                reason: MovementReason.INTAKE
            });

            // Assert
            expect(movement.assetId).toBe('asset-uuid-1');
            expect(movement.toLocation).toBe('loc-uuid-1');
            expect(movement.reason).toBe(MovementReason.INTAKE);
            expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    assetId: 'asset-uuid-1',
                    toLocation: 'loc-uuid-1',
                    reason: MovementReason.INTAKE
                })
            });
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetMoved')
            );
        });
    });

    describe('Reservations', () => {
        const mockSellableAsset: AssetServiceResponse = {
            id: 'asset-uuid-1',
            serialNumber: 'SN-001',
            assetType: 'LAPTOP',
            brand: 'Dell',
            model: 'XPS 15',
            chassisRef: null,
            status: 'SELLABLE',
            grade: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        };

        const mockNonSellableAsset: AssetServiceResponse = {
            ...mockSellableAsset,
            status: 'QUALITY_PENDING'
        };

        test('should_not_allow_double_reservation', async () => {
            // Arrange - Asset SELLABLE mais déjà réservé
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockSellableAsset);
            (mockPrisma.inventoryReservation.findUnique as jest.Mock).mockResolvedValue({
                id: 'res-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'ORDER-001',
                createdAt: new Date()
            });

            // Act & Assert
            await expect(
                service.reserveAsset('asset-uuid-1', { orderRef: 'ORDER-002' })
            ).rejects.toThrow(AssetAlreadyReservedError);

            // Vérifier que create n'a pas été appelé
            expect(mockPrisma.inventoryReservation.create).not.toHaveBeenCalled();
        });

        test('should_reserve_only_sellable_asset', async () => {
            // Arrange - Asset pas SELLABLE
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockNonSellableAsset);

            // Act & Assert
            await expect(
                service.reserveAsset('asset-uuid-1', { orderRef: 'ORDER-001' })
            ).rejects.toThrow(AssetNotSellableError);

            // Vérifier que la vérification a bien utilisé Asset Service
            expect(mockAssetServiceClient.getAsset).toHaveBeenCalledWith('asset-uuid-1');

            // Vérifier que create n'a pas été appelé
            expect(mockPrisma.inventoryReservation.create).not.toHaveBeenCalled();
        });

        test('should_release_reservation', async () => {
            // Arrange - Réservation existante
            const existingReservation = {
                id: 'res-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'ORDER-001',
                createdAt: new Date()
            };
            (mockPrisma.inventoryReservation.findUnique as jest.Mock).mockResolvedValue(existingReservation);
            (mockPrisma.inventoryMovement.findFirst as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                toLocation: 'loc-uuid-1',
                reason: MovementReason.RESERVE,
                createdAt: new Date()
            });
            (mockPrisma.inventoryMovement.create as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-2',
                assetId: 'asset-uuid-1',
                fromLocation: 'loc-uuid-1',
                toLocation: 'loc-uuid-1',
                reason: MovementReason.RELEASE,
                createdAt: new Date()
            });
            (mockPrisma.inventoryReservation.delete as jest.Mock).mockResolvedValue(existingReservation);

            // Act
            await service.releaseReservation('asset-uuid-1');

            // Assert
            expect(mockPrisma.inventoryReservation.delete).toHaveBeenCalledWith({
                where: { assetId: 'asset-uuid-1' }
            });
            expect(mockPrisma.inventoryMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    assetId: 'asset-uuid-1',
                    reason: MovementReason.RELEASE
                })
            });
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetReservationReleased')
            );
        });

        test('should_fail_release_if_not_reserved', async () => {
            // Arrange - Pas de réservation
            (mockPrisma.inventoryReservation.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.releaseReservation('asset-uuid-1')
            ).rejects.toThrow(AssetNotReservedError);

            // Vérifier que delete n'a pas été appelé
            expect(mockPrisma.inventoryReservation.delete).not.toHaveBeenCalled();
        });
    });

    describe('Availability', () => {
        test('should_compute_asset_availability_correctly', async () => {
            // Arrange - Asset SELLABLE, pas réservé, avec emplacement
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'LAPTOP',
                brand: 'Dell',
                model: 'XPS 15',
                chassisRef: null,
                status: 'SELLABLE',
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.inventoryReservation.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.inventoryMovement.findFirst as jest.Mock).mockResolvedValue({
                id: 'mov-uuid-1',
                assetId: 'asset-uuid-1',
                toLocation: 'loc-uuid-1',
                reason: MovementReason.INTAKE,
                createdAt: new Date()
            });
            (mockPrisma.location.findUnique as jest.Mock).mockResolvedValue({
                id: 'loc-uuid-1',
                code: 'A-01-01'
            });

            // Act
            const availability = await service.checkAvailability('asset-uuid-1');

            // Assert
            expect(availability.available).toBe(true);
            expect(availability.location).toBe('A-01-01');
            expect(availability.reason).toBeUndefined();
        });

        test('should_return_unavailable_if_reserved', async () => {
            // Arrange - Asset SELLABLE mais réservé
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'LAPTOP',
                brand: 'Dell',
                model: 'XPS 15',
                chassisRef: null,
                status: 'SELLABLE',
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.inventoryReservation.findUnique as jest.Mock).mockResolvedValue({
                id: 'res-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'ORDER-001',
                createdAt: new Date()
            });

            // Act
            const availability = await service.checkAvailability('asset-uuid-1');

            // Assert
            expect(availability.available).toBe(false);
            expect(availability.reason).toContain('reserved');
        });

        test('should_return_unavailable_if_not_sellable', async () => {
            // Arrange - Asset pas SELLABLE
            const mockAsset: AssetServiceResponse = {
                id: 'asset-uuid-1',
                serialNumber: 'SN-001',
                assetType: 'LAPTOP',
                brand: 'Dell',
                model: 'XPS 15',
                chassisRef: null,
                status: 'QUALITY_PENDING',
                grade: null,
                createdAt: '2026-01-01T00:00:00Z',
                updatedAt: '2026-01-01T00:00:00Z'
            };
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);

            // Act
            const availability = await service.checkAvailability('asset-uuid-1');

            // Assert
            expect(availability.available).toBe(false);
            expect(availability.reason).toContain('QUALITY_PENDING');
        });
    });
});
