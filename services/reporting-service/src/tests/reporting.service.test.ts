/**
 * Reporting Service Tests
 * Tests unitaires pour le service Reporting RSE
 */

import { PrismaClient } from '@prisma/client';
import { ReportingService, SnapshotAlreadyExistsError, AssetNotEligibleError } from '../services/reporting.service';
import { AssetServiceClient, AssetResponse } from '../integrations/asset.client';
import { OrderServiceClient, OrderResponse } from '../integrations/order.client';

// Mock PrismaClient
const mockPrisma = {
    rseSnapshot: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

// Mock des clients
const mockAssetClient: AssetServiceClient = {
    getAsset: jest.fn()
};

const mockOrderClient: OrderServiceClient = {
    getOrdersByCustomer: jest.fn(),
    getOrdersByAsset: jest.fn()
};

// Données de test
const sellableAsset: AssetResponse = {
    id: 'asset-uuid-1',
    serialNumber: 'SN-TEST-001',
    assetType: 'SERVER',
    brand: 'Dell',
    model: 'R740',
    status: 'SELLABLE'
};

const intakeAsset: AssetResponse = {
    ...sellableAsset,
    id: 'asset-uuid-2',
    status: 'INTAKE'
};

describe('ReportingService', () => {
    let service: ReportingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ReportingService(
            mockPrisma,
            mockAssetClient,
            mockOrderClient
        );
    });

    describe('RSE Snapshot Calculation', () => {
        test('should_calculate_rse_snapshot_for_sellable_asset', async () => {
            // Arrange - Asset SELLABLE
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(sellableAsset);
            (mockPrisma.rseSnapshot.findUnique as jest.Mock).mockResolvedValue(null);
            (mockPrisma.rseSnapshot.create as jest.Mock).mockResolvedValue({
                id: 'snapshot-uuid-1',
                assetId: 'asset-uuid-1',
                co2SavedKg: 900,
                waterSavedL: 120000,
                energySavedKwh: 500,
                calculatedAt: new Date()
            });

            // Act
            const snapshot = await service.calculateRseSnapshot('asset-uuid-1');

            // Assert
            expect(snapshot.assetId).toBe('asset-uuid-1');
            expect(snapshot.co2SavedKg).toBe(900); // SERVER = 900 kg CO2
            expect(snapshot.waterSavedL).toBe(120000); // SERVER = 120000 L
            expect(snapshot.energySavedKwh).toBe(500); // SERVER = 500 kWh
            expect(mockPrisma.rseSnapshot.create).toHaveBeenCalledWith({
                data: {
                    assetId: 'asset-uuid-1',
                    co2SavedKg: 900,
                    waterSavedL: 120000,
                    energySavedKwh: 500
                }
            });
        });

        test('should_not_recalculate_existing_snapshot', async () => {
            // Arrange - Snapshot déjà existant
            (mockPrisma.rseSnapshot.findUnique as jest.Mock).mockResolvedValue({
                id: 'snapshot-uuid-1',
                assetId: 'asset-uuid-1',
                co2SavedKg: 900,
                waterSavedL: 120000,
                energySavedKwh: 500,
                calculatedAt: new Date()
            });

            // Act & Assert - Doit échouer avec SnapshotAlreadyExistsError
            await expect(
                service.calculateRseSnapshot('asset-uuid-1')
            ).rejects.toThrow(SnapshotAlreadyExistsError);

            // Vérifier que create n'a PAS été appelé
            expect(mockPrisma.rseSnapshot.create).not.toHaveBeenCalled();
        });

        test('should reject non-eligible asset status', async () => {
            // Arrange - Asset en INTAKE (non éligible)
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(intakeAsset);
            (mockPrisma.rseSnapshot.findUnique as jest.Mock).mockResolvedValue(null);

            // Act & Assert
            await expect(
                service.calculateRseSnapshot('asset-uuid-2')
            ).rejects.toThrow(AssetNotEligibleError);

            expect(mockPrisma.rseSnapshot.create).not.toHaveBeenCalled();
        });
    });

    describe('Customer Report Aggregation', () => {
        test('should_aggregate_rse_per_customer', async () => {
            // Arrange - Client avec 2 commandes
            const orders: OrderResponse[] = [
                {
                    id: 'order-1',
                    assetId: 'asset-uuid-1',
                    customerRef: 'CLIENT-ACME',
                    status: 'COMPLETED',
                    createdAt: '2026-02-05T00:00:00Z'
                },
                {
                    id: 'order-2',
                    assetId: 'asset-uuid-3',
                    customerRef: 'CLIENT-ACME',
                    status: 'COMPLETED',
                    createdAt: '2026-02-05T00:00:00Z'
                }
            ];

            (mockOrderClient.getOrdersByCustomer as jest.Mock).mockResolvedValue(orders);
            (mockPrisma.rseSnapshot.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'snap-1',
                    assetId: 'asset-uuid-1',
                    co2SavedKg: 900,
                    waterSavedL: 120000,
                    energySavedKwh: 500,
                    calculatedAt: new Date()
                },
                {
                    id: 'snap-2',
                    assetId: 'asset-uuid-3',
                    co2SavedKg: 350, // WORKSTATION
                    waterSavedL: 45000,
                    energySavedKwh: 200,
                    calculatedAt: new Date()
                }
            ]);

            // Act
            const report = await service.getCustomerReport('CLIENT-ACME');

            // Assert
            expect(report.customerRef).toBe('CLIENT-ACME');
            expect(report.assetCount).toBe(2);
            expect(report.totalCo2SavedKg).toBe(1250); // 900 + 350
            expect(report.totalWaterSavedL).toBe(165000); // 120000 + 45000
            expect(report.totalEnergySavedKwh).toBe(700); // 500 + 200
            expect(report.generatedAt).toBeDefined();
        });

        test('should return empty report for customer with no orders', async () => {
            // Arrange - Pas de commandes
            (mockOrderClient.getOrdersByCustomer as jest.Mock).mockResolvedValue([]);

            // Act
            const report = await service.getCustomerReport('CLIENT-NEW');

            // Assert
            expect(report.customerRef).toBe('CLIENT-NEW');
            expect(report.assetCount).toBe(0);
            expect(report.totalCo2SavedKg).toBe(0);
            expect(report.totalWaterSavedL).toBe(0);
            expect(report.totalEnergySavedKwh).toBe(0);
        });
    });
});
