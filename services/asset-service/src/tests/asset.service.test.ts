/**
 * Asset Service Tests
 * Tests unitaires pour le Asset Service
 */

import { AssetService } from '../services/asset.service';
import { AssetRepository } from '../repositories/asset.repository';
import { AssetHistoryRepository } from '../repositories/assetHistory.repository';
import { isTransitionAllowed } from '../domain/assetTransitions';
import {
    CreateAssetDto,
    AssetEntity,
    DuplicateSerialNumberError,
    InvalidTransitionError,
    AssetNotFoundError
} from '../domain/asset.types';
import { AssetStatus, AssetType, PrismaClient } from '@prisma/client';

// Mock du PrismaClient
const mockPrisma = {
    asset: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    assetStateHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

// Mock des événements (console.log)
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('AssetService', () => {
    let service: AssetService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AssetService(mockPrisma);
    });

    describe('createAsset', () => {
        const validDto: CreateAssetDto = {
            serialNumber: 'SN123',
            assetType: AssetType.SERVER,
            brand: 'Dell',
            model: 'R740',
            chassisRef: 'R740'
        };

        const mockCreatedAsset: AssetEntity = {
            id: 'uuid-1',
            serialNumber: 'SN123',
            assetType: AssetType.SERVER,
            brand: 'Dell',
            model: 'R740',
            chassisRef: 'R740',
            status: AssetStatus.ACQUIRED,
            grade: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        test('should_create_asset_with_initial_status_acquired', async () => {
            // Arrange
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.asset.create as jest.Mock).mockResolvedValue(mockCreatedAsset);
            (mockPrisma.assetStateHistory.create as jest.Mock).mockResolvedValue({
                id: 'history-1',
                assetId: 'uuid-1',
                previousStatus: null,
                newStatus: AssetStatus.ACQUIRED,
                reason: 'Initial acquisition',
                createdAt: new Date()
            });

            // Act
            const result = await service.createAsset(validDto);

            // Assert
            expect(result.status).toBe(AssetStatus.ACQUIRED);
            expect(result.serialNumber).toBe('SN123');
            expect(mockPrisma.asset.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    serialNumber: 'SN123',
                    status: AssetStatus.ACQUIRED
                })
            });
        });

        test('should_reject_duplicate_serial_number', async () => {
            // Arrange
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(mockCreatedAsset);

            // Act & Assert
            await expect(service.createAsset(validDto)).rejects.toThrow(DuplicateSerialNumberError);
            await expect(service.createAsset(validDto)).rejects.toThrow('Asset with serial number SN123 already exists');
        });

        test('should_create_asset_state_history_entry', async () => {
            // Arrange
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.asset.create as jest.Mock).mockResolvedValue(mockCreatedAsset);
            (mockPrisma.assetStateHistory.create as jest.Mock).mockResolvedValue({
                id: 'history-1',
                assetId: 'uuid-1',
                previousStatus: null,
                newStatus: AssetStatus.ACQUIRED,
                reason: 'Initial acquisition',
                createdAt: new Date()
            });

            // Act
            await service.createAsset(validDto);

            // Assert
            expect(mockPrisma.assetStateHistory.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    assetId: 'uuid-1',
                    previousStatus: null,
                    newStatus: AssetStatus.ACQUIRED,
                    reason: 'Initial acquisition'
                })
            });
        });
    });

    describe('changeStatus', () => {
        const mockAssetAcquired: AssetEntity = {
            id: 'uuid-1',
            serialNumber: 'SN123',
            assetType: AssetType.SERVER,
            brand: 'Dell',
            model: 'R740',
            chassisRef: 'R740',
            status: AssetStatus.ACQUIRED,
            grade: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const mockAssetInRefurb: AssetEntity = {
            ...mockAssetAcquired,
            status: AssetStatus.IN_REFURB
        };

        test('should_allow_valid_status_transition', async () => {
            // Arrange
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAssetAcquired);
            (mockPrisma.asset.update as jest.Mock).mockResolvedValue(mockAssetInRefurb);
            (mockPrisma.assetStateHistory.create as jest.Mock).mockResolvedValue({
                id: 'history-2',
                assetId: 'uuid-1',
                previousStatus: AssetStatus.ACQUIRED,
                newStatus: AssetStatus.IN_REFURB,
                reason: 'Starting refurbishment',
                createdAt: new Date()
            });

            // Act
            const result = await service.changeStatus('uuid-1', {
                newStatus: AssetStatus.IN_REFURB,
                reason: 'Starting refurbishment'
            });

            // Assert
            expect(result.status).toBe(AssetStatus.IN_REFURB);
            expect(mockPrisma.asset.update).toHaveBeenCalledWith({
                where: { id: 'uuid-1' },
                data: { status: AssetStatus.IN_REFURB }
            });
        });

        test('should_reject_invalid_status_transition', async () => {
            // Arrange - ACQUIRED ne peut pas aller directement à SOLD
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(mockAssetAcquired);

            // Act & Assert
            await expect(
                service.changeStatus('uuid-1', { newStatus: AssetStatus.SOLD })
            ).rejects.toThrow(InvalidTransitionError);

            await expect(
                service.changeStatus('uuid-1', { newStatus: AssetStatus.SOLD })
            ).rejects.toThrow('Invalid transition from ACQUIRED to SOLD');
        });
    });

    describe('assetTransitions', () => {
        test('should_allow_transition_to_SCRAPPED_from_any_state', () => {
            // Règle spéciale : SCRAPPED autorisé depuis n'importe quel état
            expect(isTransitionAllowed(AssetStatus.ACQUIRED, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.IN_REFURB, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.QUALITY_PENDING, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.SELLABLE, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.RESERVED, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.SOLD, AssetStatus.SCRAPPED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.RMA, AssetStatus.SCRAPPED)).toBe(true);
        });

        test('should_follow_defined_transition_matrix', () => {
            // Transitions valides
            expect(isTransitionAllowed(AssetStatus.ACQUIRED, AssetStatus.IN_REFURB)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.IN_REFURB, AssetStatus.QUALITY_PENDING)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.QUALITY_PENDING, AssetStatus.SELLABLE)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.SELLABLE, AssetStatus.RESERVED)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.RESERVED, AssetStatus.SOLD)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.SOLD, AssetStatus.RMA)).toBe(true);
            expect(isTransitionAllowed(AssetStatus.RMA, AssetStatus.SELLABLE)).toBe(true);

            // Transitions invalides
            expect(isTransitionAllowed(AssetStatus.ACQUIRED, AssetStatus.SOLD)).toBe(false);
            expect(isTransitionAllowed(AssetStatus.SELLABLE, AssetStatus.ACQUIRED)).toBe(false);
            expect(isTransitionAllowed(AssetStatus.SCRAPPED, AssetStatus.ACQUIRED)).toBe(false);
        });
    });

    describe('history immutability', () => {
        test('should_not_allow_history_update_or_delete', () => {
            // Vérifier que AssetHistoryRepository n'a PAS de méthodes update/delete
            const historyRepo = new AssetHistoryRepository(mockPrisma);

            // @ts-expect-error - Vérification que la méthode n'existe pas
            expect(historyRepo.update).toBeUndefined();
            // @ts-expect-error - Vérification que la méthode n'existe pas
            expect(historyRepo.delete).toBeUndefined();

            // Seules les méthodes de lecture et création existent
            expect(typeof historyRepo.create).toBe('function');
            expect(typeof historyRepo.findByAssetId).toBe('function');
            expect(typeof historyRepo.findLastByAssetId).toBe('function');
            expect(typeof historyRepo.countByAssetId).toBe('function');
        });
    });

    describe('edge cases', () => {
        test('should_throw_AssetNotFoundError_for_unknown_asset', async () => {
            // Arrange
            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.changeStatus('unknown-id', { newStatus: AssetStatus.IN_REFURB })
            ).rejects.toThrow(AssetNotFoundError);
        });

        test('should_emit_events_on_creation_and_status_change', async () => {
            // Arrange
            const mockAsset: AssetEntity = {
                id: 'uuid-1',
                serialNumber: 'SN123',
                assetType: AssetType.SERVER,
                brand: 'Dell',
                model: 'R740',
                chassisRef: 'R740',
                status: AssetStatus.ACQUIRED,
                grade: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            (mockPrisma.asset.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.asset.create as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.assetStateHistory.create as jest.Mock).mockResolvedValue({
                id: 'history-1',
                assetId: 'uuid-1',
                previousStatus: null,
                newStatus: AssetStatus.ACQUIRED,
                reason: 'Initial acquisition',
                createdAt: new Date()
            });

            // Act
            await service.createAsset({
                serialNumber: 'SN123',
                assetType: AssetType.SERVER,
                brand: 'Dell',
                model: 'R740'
            });

            // Assert - Vérifier que console.log a été appelé avec l'événement
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetCreated')
            );
        });
    });
});
