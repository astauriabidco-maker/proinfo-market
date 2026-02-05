/**
 * Procurement Service Tests
 * Tests unitaires pour le Procurement Service
 */

import { ProcurementService, AssetServiceClient } from '../services/procurement.service';
import { ProcurementLotRepository } from '../repositories/procurementLot.repository';
import { ProcurementItemRepository } from '../repositories/procurementItem.repository';
import {
    CreateProcurementLotDto,
    IntakeAssetDto,
    ProcurementLotEntity,
    ProcurementLotNotFoundError,
    IntakeQuotaExceededError,
    AssetServiceError,
    AssetServiceResponse,
    ValidationError
} from '../domain/procurement.types';
import { SupplierType, PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock du PrismaClient
const mockPrisma = {
    procurementLot: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
    },
    procurementLotItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

// Mock du client Asset Service
const mockAssetServiceClient: AssetServiceClient = {
    createAsset: jest.fn()
};

// Mock des événements (console.log)
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('ProcurementService', () => {
    let service: ProcurementService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ProcurementService(mockPrisma, mockAssetServiceClient);
    });

    describe('createLot', () => {
        const validDto: CreateProcurementLotDto = {
            supplierName: 'BNP Leasing',
            supplierType: SupplierType.LEASING,
            purchaseDate: '2026-01-10',
            totalUnitsDeclared: 50,
            totalPurchasePrice: 25000
        };

        const mockCreatedLot: ProcurementLotEntity = {
            id: 'lot-uuid-1',
            supplierName: 'BNP Leasing',
            supplierType: SupplierType.LEASING,
            purchaseDate: new Date('2026-01-10'),
            totalUnitsDeclared: 50,
            totalPurchasePrice: new Decimal(25000),
            createdAt: new Date()
        };

        test('should_create_procurement_lot', async () => {
            // Arrange
            (mockPrisma.procurementLot.create as jest.Mock).mockResolvedValue({
                ...mockCreatedLot,
                totalPurchasePrice: new Decimal(25000)
            });

            // Act
            const result = await service.createLot(validDto);

            // Assert
            expect(result.supplierName).toBe('BNP Leasing');
            expect(result.supplierType).toBe(SupplierType.LEASING);
            expect(result.totalUnitsDeclared).toBe(50);
            expect(mockPrisma.procurementLot.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    supplierName: 'BNP Leasing',
                    supplierType: SupplierType.LEASING,
                    totalUnitsDeclared: 50
                })
            });
            // Vérifier que l'événement a été émis
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('ProcurementLotCreated')
            );
        });

        test('should_reject_invalid_lot_creation', async () => {
            // Arrange - totalUnitsDeclared <= 0
            const invalidDto = { ...validDto, totalUnitsDeclared: 0 };

            // Act & Assert
            await expect(service.createLot(invalidDto)).rejects.toThrow(ValidationError);
            await expect(service.createLot(invalidDto)).rejects.toThrow('totalUnitsDeclared must be greater than 0');
        });
    });

    describe('intakeAsset', () => {
        const mockLot: ProcurementLotEntity = {
            id: 'lot-uuid-1',
            supplierName: 'BNP Leasing',
            supplierType: SupplierType.LEASING,
            purchaseDate: new Date('2026-01-10'),
            totalUnitsDeclared: 50,
            totalPurchasePrice: new Decimal(25000),
            createdAt: new Date(),
            itemCount: 0
        };

        const intakeDto: IntakeAssetDto = {
            serialNumber: 'SN-0001',
            assetType: 'SERVER',
            brand: 'Dell',
            model: 'R740',
            chassisRef: 'R740',
            unitCost: 500
        };

        const mockAssetResponse: AssetServiceResponse = {
            id: 'asset-uuid-1',
            serialNumber: 'SN-0001',
            assetType: 'SERVER',
            brand: 'Dell',
            model: 'R740',
            chassisRef: 'R740',
            status: 'ACQUIRED',
            grade: null,
            createdAt: '2026-01-10T00:00:00Z',
            updatedAt: '2026-01-10T00:00:00Z'
        };

        test('should_not_allow_intake_above_declared_quantity', async () => {
            // Arrange - lot avec quota atteint
            const fullLot = { ...mockLot, itemCount: 50 };
            (mockPrisma.procurementLot.findUnique as jest.Mock).mockResolvedValue({
                ...fullLot,
                _count: { items: 50 }
            });
            (mockPrisma.procurementLotItem.count as jest.Mock).mockResolvedValue(50);

            // Act & Assert
            await expect(service.intakeAsset('lot-uuid-1', intakeDto)).rejects.toThrow(IntakeQuotaExceededError);
            await expect(service.intakeAsset('lot-uuid-1', intakeDto)).rejects.toThrow('Intake quota exceeded');

            // Vérifier que Asset Service n'a PAS été appelé
            expect(mockAssetServiceClient.createAsset).not.toHaveBeenCalled();
        });

        test('should_create_asset_via_asset_service', async () => {
            // Arrange
            (mockPrisma.procurementLot.findUnique as jest.Mock).mockResolvedValue({
                ...mockLot,
                _count: { items: 0 }
            });
            (mockPrisma.procurementLotItem.count as jest.Mock).mockResolvedValue(0);
            (mockAssetServiceClient.createAsset as jest.Mock).mockResolvedValue(mockAssetResponse);
            (mockPrisma.procurementLotItem.create as jest.Mock).mockResolvedValue({
                id: 'item-uuid-1',
                lotId: 'lot-uuid-1',
                assetId: 'asset-uuid-1',
                unitCost: new Decimal(500),
                createdAt: new Date()
            });

            // Act
            await service.intakeAsset('lot-uuid-1', intakeDto);

            // Assert - Vérifier que Asset Service a été appelé avec les bons paramètres
            expect(mockAssetServiceClient.createAsset).toHaveBeenCalledWith({
                serialNumber: 'SN-0001',
                assetType: 'SERVER',
                brand: 'Dell',
                model: 'R740',
                chassisRef: 'R740'
            });
        });

        test('should_link_asset_to_procurement_lot', async () => {
            // Arrange
            (mockPrisma.procurementLot.findUnique as jest.Mock).mockResolvedValue({
                ...mockLot,
                _count: { items: 0 }
            });
            (mockPrisma.procurementLotItem.count as jest.Mock).mockResolvedValue(0);
            (mockAssetServiceClient.createAsset as jest.Mock).mockResolvedValue(mockAssetResponse);
            (mockPrisma.procurementLotItem.create as jest.Mock).mockResolvedValue({
                id: 'item-uuid-1',
                lotId: 'lot-uuid-1',
                assetId: 'asset-uuid-1',
                unitCost: new Decimal(500),
                createdAt: new Date()
            });

            // Act
            const result = await service.intakeAsset('lot-uuid-1', intakeDto);

            // Assert - Vérifier que l'item a été créé avec le bon assetId
            expect(result.assetId).toBe('asset-uuid-1');
            expect(result.lotId).toBe('lot-uuid-1');
            expect(mockPrisma.procurementLotItem.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    lotId: 'lot-uuid-1',
                    assetId: 'asset-uuid-1'
                })
            });
            // Vérifier que l'événement AssetIntaked a été émis
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('AssetIntaked')
            );
        });

        test('should_fail_intake_if_asset_service_fails', async () => {
            // Arrange
            (mockPrisma.procurementLot.findUnique as jest.Mock).mockResolvedValue({
                ...mockLot,
                _count: { items: 0 }
            });
            (mockPrisma.procurementLotItem.count as jest.Mock).mockResolvedValue(0);
            (mockAssetServiceClient.createAsset as jest.Mock).mockRejectedValue(
                new AssetServiceError(409, 'Asset with serial number SN-0001 already exists')
            );

            // Act & Assert
            await expect(service.intakeAsset('lot-uuid-1', intakeDto)).rejects.toThrow(AssetServiceError);
            await expect(service.intakeAsset('lot-uuid-1', intakeDto)).rejects.toThrow('Asset Service error');

            // Vérifier que ProcurementLotItem n'a PAS été créé
            expect(mockPrisma.procurementLotItem.create).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        test('should_throw_ProcurementLotNotFoundError_for_unknown_lot', async () => {
            // Arrange
            (mockPrisma.procurementLot.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.intakeAsset('unknown-lot', {
                    serialNumber: 'SN-0001',
                    assetType: 'SERVER',
                    brand: 'Dell',
                    model: 'R740',
                    unitCost: 500
                })
            ).rejects.toThrow(ProcurementLotNotFoundError);
        });
    });
});
