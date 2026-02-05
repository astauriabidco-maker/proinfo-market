/**
 * Quality Service Tests
 * Tests unitaires pour le Quality Service
 */

import { QualityService } from '../services/quality.service';
import { AssetServiceClient, AssetServiceResponse } from '../integrations/asset.client';
import { QualityResultRepository } from '../repositories/qualityResult.repository';
import {
    InvalidAssetStatusError,
    QualityResultAlreadyExistsError,
    QualityValidationFailedError
} from '../domain/qualityResult.types';
import { BATTERY_SOH_THRESHOLD } from '../domain/battery.types';
import { AssetType, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock du PrismaClient
const mockPrisma = {
    qualityChecklist: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    qualityChecklistItem: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    qualityResult: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    },
    batteryHealth: {
        upsert: jest.fn(),
        findUnique: jest.fn()
    }
} as unknown as PrismaClient;

// Mock du client Asset Service
const mockAssetServiceClient: AssetServiceClient = {
    getAsset: jest.fn(),
    changeStatus: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('QualityService', () => {
    let service: QualityService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new QualityService(mockPrisma, mockAssetServiceClient);
    });

    describe('Validation qualité globale', () => {
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

        const mockChecklist = {
            id: 'checklist-1',
            name: 'Laptop Standard v1',
            assetType: AssetType.LAPTOP,
            version: 1,
            createdAt: new Date(),
            items: [
                { id: 'item-1', checklistId: 'checklist-1', code: 'SCREEN', description: 'Screen test', isBlocking: true },
                { id: 'item-2', checklistId: 'checklist-1', code: 'USB', description: 'USB test', isBlocking: true },
                { id: 'item-3', checklistId: 'checklist-1', code: 'COSMETIC', description: 'Cosmetic', isBlocking: false }
            ]
        };

        test('should_not_validate_asset_with_missing_quality_results', async () => {
            // Arrange - Asset sans tous les résultats requis
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.qualityChecklist.findFirst as jest.Mock).mockResolvedValue(mockChecklist);
            // Seulement 1 résultat sur 3 items
            (mockPrisma.qualityResult.findMany as jest.Mock).mockResolvedValue([
                { id: 'result-1', assetId: 'asset-uuid-1', checklistItemId: 'item-1', result: 'PASS', measuredValue: null, createdAt: new Date() }
            ]);
            (mockPrisma.batteryHealth.findUnique as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                stateOfHealth: 90,
                cycles: 150,
                measuredAt: new Date()
            });

            // Act & Assert
            await expect(service.validateQuality('asset-uuid-1')).rejects.toThrow(QualityValidationFailedError);

            try {
                await service.validateQuality('asset-uuid-1');
            } catch (error) {
                expect(error).toBeInstanceOf(QualityValidationFailedError);
                const validationError = error as QualityValidationFailedError;
                expect(validationError.validationResult.details.checklistComplete).toBe(false);
                expect(validationError.validationResult.details.missingItems).toContain('USB');
                expect(validationError.validationResult.details.missingItems).toContain('COSMETIC');
            }
        });

        test('should_fail_validation_if_blocking_item_failed', async () => {
            // Arrange - Un item bloquant FAIL
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.qualityChecklist.findFirst as jest.Mock).mockResolvedValue(mockChecklist);
            (mockPrisma.qualityResult.findMany as jest.Mock).mockResolvedValue([
                { id: 'result-1', assetId: 'asset-uuid-1', checklistItemId: 'item-1', result: 'FAIL', measuredValue: null, createdAt: new Date() },
                { id: 'result-2', assetId: 'asset-uuid-1', checklistItemId: 'item-2', result: 'PASS', measuredValue: null, createdAt: new Date() },
                { id: 'result-3', assetId: 'asset-uuid-1', checklistItemId: 'item-3', result: 'PASS', measuredValue: null, createdAt: new Date() }
            ]);
            (mockPrisma.batteryHealth.findUnique as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                stateOfHealth: 90,
                cycles: 150,
                measuredAt: new Date()
            });

            // Act & Assert
            try {
                await service.validateQuality('asset-uuid-1');
                fail('Should have thrown QualityValidationFailedError');
            } catch (error) {
                expect(error).toBeInstanceOf(QualityValidationFailedError);
                const validationError = error as QualityValidationFailedError;
                expect(validationError.validationResult.details.blockingFailures).toContain('SCREEN');
                expect(validationError.validationResult.reason).toContain('Blocking items failed');
            }
        });

        test('should_fail_validation_if_battery_below_threshold', async () => {
            // Arrange - Batterie sous le seuil de 85%
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.qualityChecklist.findFirst as jest.Mock).mockResolvedValue(mockChecklist);
            (mockPrisma.qualityResult.findMany as jest.Mock).mockResolvedValue([
                { id: 'result-1', assetId: 'asset-uuid-1', checklistItemId: 'item-1', result: 'PASS', measuredValue: null, createdAt: new Date() },
                { id: 'result-2', assetId: 'asset-uuid-1', checklistItemId: 'item-2', result: 'PASS', measuredValue: null, createdAt: new Date() },
                { id: 'result-3', assetId: 'asset-uuid-1', checklistItemId: 'item-3', result: 'PASS', measuredValue: null, createdAt: new Date() }
            ]);
            // Batterie à 80% < seuil 85%
            (mockPrisma.batteryHealth.findUnique as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                stateOfHealth: 80,
                cycles: 500,
                measuredAt: new Date()
            });

            // Act & Assert
            try {
                await service.validateQuality('asset-uuid-1');
                fail('Should have thrown QualityValidationFailedError');
            } catch (error) {
                expect(error).toBeInstanceOf(QualityValidationFailedError);
                const validationError = error as QualityValidationFailedError;
                expect(validationError.validationResult.details.batteryOk).toBe(false);
                expect(validationError.validationResult.reason).toContain(`below threshold ${BATTERY_SOH_THRESHOLD}%`);
            }
        });

        test('should_validate_asset_and_set_status_sellable', async () => {
            // Arrange - Tout est OK
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue(mockAsset);
            (mockPrisma.qualityChecklist.findFirst as jest.Mock).mockResolvedValue(mockChecklist);
            (mockPrisma.qualityResult.findMany as jest.Mock).mockResolvedValue([
                { id: 'result-1', assetId: 'asset-uuid-1', checklistItemId: 'item-1', result: 'PASS', measuredValue: null, createdAt: new Date() },
                { id: 'result-2', assetId: 'asset-uuid-1', checklistItemId: 'item-2', result: 'PASS', measuredValue: null, createdAt: new Date() },
                { id: 'result-3', assetId: 'asset-uuid-1', checklistItemId: 'item-3', result: 'PASS', measuredValue: null, createdAt: new Date() }
            ]);
            (mockPrisma.batteryHealth.findUnique as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                stateOfHealth: 92,
                cycles: 150,
                measuredAt: new Date()
            });
            (mockAssetServiceClient.changeStatus as jest.Mock).mockResolvedValue({
                ...mockAsset,
                status: 'SELLABLE'
            });

            // Act
            const result = await service.validateQuality('asset-uuid-1');

            // Assert
            expect(result.isValid).toBe(true);
            expect(mockAssetServiceClient.changeStatus).toHaveBeenCalledWith(
                'asset-uuid-1',
                'SELLABLE',
                'Quality validation passed'
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('QualityPassed')
            );
        });
    });

    describe('Enregistrement résultats qualité', () => {
        test('should_not_allow_quality_result_update', async () => {
            // Arrange - Asset en QUALITY_PENDING
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue({
                id: 'asset-uuid-1',
                status: 'QUALITY_PENDING',
                assetType: 'LAPTOP'
            });
            // Résultat déjà existant
            (mockPrisma.qualityResult.count as jest.Mock).mockResolvedValue(1);

            // Act & Assert
            await expect(
                service.recordQualityResult('asset-uuid-1', {
                    checklistItemId: 'item-1',
                    result: 'PASS'
                })
            ).rejects.toThrow(QualityResultAlreadyExistsError);

            // Vérifier que create n'a pas été appelé
            expect(mockPrisma.qualityResult.create).not.toHaveBeenCalled();
        });

        test('should_reject_result_if_asset_not_quality_pending', async () => {
            // Arrange - Asset pas en QUALITY_PENDING
            (mockAssetServiceClient.getAsset as jest.Mock).mockResolvedValue({
                id: 'asset-uuid-1',
                status: 'ACQUIRED',
                assetType: 'LAPTOP'
            });

            // Act & Assert
            await expect(
                service.recordQualityResult('asset-uuid-1', {
                    checklistItemId: 'item-1',
                    result: 'PASS'
                })
            ).rejects.toThrow(InvalidAssetStatusError);
        });
    });

    describe('Enregistrement santé batterie', () => {
        test('should_record_battery_health', async () => {
            // Arrange
            const batteryData = {
                assetId: 'asset-uuid-1',
                stateOfHealth: 92,
                cycles: 180,
                measuredAt: new Date()
            };
            (mockPrisma.batteryHealth.upsert as jest.Mock).mockResolvedValue(batteryData);

            // Act
            const result = await service.recordBatteryHealth('asset-uuid-1', {
                stateOfHealth: 92,
                cycles: 180
            });

            // Assert
            expect(result.stateOfHealth).toBe(92);
            expect(result.cycles).toBe(180);
            expect(mockPrisma.batteryHealth.upsert).toHaveBeenCalledWith({
                where: { assetId: 'asset-uuid-1' },
                create: expect.objectContaining({
                    assetId: 'asset-uuid-1',
                    stateOfHealth: 92,
                    cycles: 180
                }),
                update: expect.objectContaining({
                    stateOfHealth: 92,
                    cycles: 180
                })
            });
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('BatteryHealthRecorded')
            );
        });

        test('should_reject_invalid_state_of_health', async () => {
            // Act & Assert - SoH > 100
            await expect(
                service.recordBatteryHealth('asset-uuid-1', {
                    stateOfHealth: 150,
                    cycles: 100
                })
            ).rejects.toThrow('State of health 150 is invalid');

            // Act & Assert - SoH < 0
            await expect(
                service.recordBatteryHealth('asset-uuid-1', {
                    stateOfHealth: -5,
                    cycles: 100
                })
            ).rejects.toThrow('State of health -5 is invalid');
        });
    });
});
