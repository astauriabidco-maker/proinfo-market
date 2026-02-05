/**
 * SAV Service Tests
 * Tests unitaires pour le service SAV & RMA
 */

import { PrismaClient, TicketStatus, RmaStatus, ResolutionType } from '@prisma/client';
import { SavService } from '../services/sav.service';
import {
    AssetNotSoldError,
    TicketNotFoundError
} from '../domain/ticket.types';
import { AssetServiceClient, AssetResponse } from '../integrations/asset.client';
import { InventoryServiceClient, MovementResponse } from '../integrations/inventory.client';
import { QualityServiceClient, QualityCheckResponse } from '../integrations/quality.client';
import { RmaNotReceivedError } from '../domain/diagnosis.types';

// Mock PrismaClient
const mockPrisma = {
    savTicket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    rma: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    rmaDiagnosis: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
    }
} as unknown as PrismaClient;

// Mock des clients
const mockAssetClient: AssetServiceClient = {
    getAsset: jest.fn(),
    updateStatus: jest.fn()
};

const mockInventoryClient: InventoryServiceClient = {
    moveAsset: jest.fn()
};

const mockQualityClient: QualityServiceClient = {
    initiateQualityCheck: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

// Données de test
const soldAsset: AssetResponse = {
    id: 'asset-uuid-1',
    serialNumber: 'SN-TEST-001',
    assetType: 'SERVER',
    brand: 'Dell',
    model: 'R740',
    chassisRef: null,
    status: 'SOLD',
    grade: 'A',
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z'
};

const notSoldAsset: AssetResponse = {
    ...soldAsset,
    status: 'SELLABLE'
};

describe('SavService', () => {
    let service: SavService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new SavService(
            mockPrisma,
            mockAssetClient,
            mockInventoryClient,
            mockQualityClient
        );
    });

    describe('Ticket Creation', () => {
        test('should_create_sav_ticket_only_for_sold_asset', async () => {
            // Arrange - Asset non vendu (SELLABLE)
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(notSoldAsset);

            // Act & Assert - Doit échouer
            await expect(
                service.createTicket({
                    assetId: 'asset-uuid-1',
                    customerRef: 'CLIENT-ACME',
                    issue: 'Server not booting'
                })
            ).rejects.toThrow(AssetNotSoldError);

            // Arrange - Asset vendu (SOLD)
            (mockAssetClient.getAsset as jest.Mock).mockResolvedValue(soldAsset);
            (mockPrisma.savTicket.create as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                assetId: 'asset-uuid-1',
                customerRef: 'CLIENT-ACME',
                issue: 'Server not booting',
                status: TicketStatus.OPEN,
                createdAt: new Date()
            });

            // Act - Doit réussir
            const ticket = await service.createTicket({
                assetId: 'asset-uuid-1',
                customerRef: 'CLIENT-ACME',
                issue: 'Server not booting'
            });

            // Assert
            expect(ticket.status).toBe(TicketStatus.OPEN);
            expect(mockPrisma.savTicket.create).toHaveBeenCalled();
        });
    });

    describe('RMA Creation', () => {
        test('should_create_rma_and_set_asset_to_rma', async () => {
            // Arrange
            (mockPrisma.savTicket.findUnique as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                assetId: 'asset-uuid-1',
                customerRef: 'CLIENT-ACME',
                issue: 'Server not booting',
                status: TicketStatus.OPEN,
                createdAt: new Date()
            });
            (mockAssetClient.updateStatus as jest.Mock).mockResolvedValue({
                ...soldAsset,
                status: 'RMA'
            });
            (mockPrisma.rma.create as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.CREATED,
                createdAt: new Date()
            });
            (mockPrisma.savTicket.update as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                status: TicketStatus.IN_PROGRESS
            });

            // Act
            const rma = await service.createRma('ticket-uuid-1');

            // Assert
            expect(rma.status).toBe(RmaStatus.CREATED);
            expect(mockAssetClient.updateStatus).toHaveBeenCalledWith('asset-uuid-1', 'RMA');
            expect(mockPrisma.rma.create).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('[EVENT]', expect.stringContaining('RmaCreated'));
        });
    });

    describe('RMA Reception', () => {
        test('should_receive_rma_and_move_inventory', async () => {
            // Arrange
            (mockPrisma.rma.findUnique as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.CREATED,
                createdAt: new Date()
            });
            (mockInventoryClient.moveAsset as jest.Mock).mockResolvedValue({
                id: 'movement-uuid-1',
                assetId: 'asset-uuid-1',
                movementType: 'RETURN',
                fromLocation: null,
                toLocation: 'SAV_ZONE',
                createdAt: '2026-02-05T00:00:00Z'
            } as MovementResponse);
            (mockPrisma.rma.update as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.RECEIVED,
                createdAt: new Date()
            });

            // Act
            const rma = await service.receiveRma('rma-uuid-1');

            // Assert
            expect(rma.status).toBe(RmaStatus.RECEIVED);
            expect(mockInventoryClient.moveAsset).toHaveBeenCalledWith('asset-uuid-1', 'RETURN', 'SAV_ZONE');
            expect(console.log).toHaveBeenCalledWith('[EVENT]', expect.stringContaining('RmaReceived'));
        });
    });

    describe('RMA Diagnosis', () => {
        test('should_diagnose_rma', async () => {
            // Arrange
            (mockPrisma.rma.findUnique as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.RECEIVED,
                createdAt: new Date()
            });
            (mockPrisma.rmaDiagnosis.create as jest.Mock).mockResolvedValue({
                id: 'diag-uuid-1',
                rmaId: 'rma-uuid-1',
                diagnosis: 'Faulty power supply',
                resolution: ResolutionType.REPAIR,
                createdAt: new Date()
            });
            (mockPrisma.rma.update as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                status: RmaStatus.DIAGNOSED
            });

            // Act
            const diagnosis = await service.diagnoseRma('rma-uuid-1', {
                diagnosis: 'Faulty power supply',
                resolution: ResolutionType.REPAIR
            });

            // Assert
            expect(diagnosis.resolution).toBe(ResolutionType.REPAIR);
            expect(mockPrisma.rmaDiagnosis.create).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('[EVENT]', expect.stringContaining('RmaDiagnosed'));
        });

        test('should_fail_diagnosis_if_rma_not_received', async () => {
            // Arrange - RMA pas encore reçu
            (mockPrisma.rma.findUnique as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.CREATED, // Pas RECEIVED
                createdAt: new Date()
            });

            // Act & Assert
            await expect(
                service.diagnoseRma('rma-uuid-1', {
                    diagnosis: 'Test',
                    resolution: ResolutionType.REPAIR
                })
            ).rejects.toThrow(RmaNotReceivedError);
        });
    });

    describe('RMA Resolution', () => {
        test('should_resolve_rma_with_repair_and_restart_quality', async () => {
            // Arrange
            (mockPrisma.rma.findUnique as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.DIAGNOSED,
                createdAt: new Date()
            });
            (mockPrisma.rmaDiagnosis.findFirst as jest.Mock).mockResolvedValue({
                id: 'diag-uuid-1',
                rmaId: 'rma-uuid-1',
                diagnosis: 'Faulty power supply',
                resolution: ResolutionType.REPAIR,
                createdAt: new Date()
            });
            (mockQualityClient.initiateQualityCheck as jest.Mock).mockResolvedValue({
                id: 'check-uuid-1',
                assetId: 'asset-uuid-1',
                checkType: 'FULL',
                status: 'PENDING',
                createdAt: '2026-02-05T00:00:00Z'
            } as QualityCheckResponse);
            (mockAssetClient.updateStatus as jest.Mock).mockResolvedValue({
                ...soldAsset,
                status: 'QUALITY_PENDING'
            });
            (mockPrisma.rma.update as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                status: RmaStatus.RESOLVED
            });
            (mockPrisma.savTicket.findUnique as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                status: TicketStatus.IN_PROGRESS
            });
            (mockPrisma.savTicket.update as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                status: TicketStatus.CLOSED
            });

            // Act
            const rma = await service.resolveRma('rma-uuid-1');

            // Assert
            expect(rma.status).toBe(RmaStatus.RESOLVED);
            expect(mockQualityClient.initiateQualityCheck).toHaveBeenCalledWith('asset-uuid-1', 'FULL');
            expect(mockAssetClient.updateStatus).toHaveBeenCalledWith('asset-uuid-1', 'QUALITY_PENDING');
            expect(console.log).toHaveBeenCalledWith('[EVENT]', expect.stringContaining('RmaResolved'));
        });

        test('should_scrap_asset_on_scrap_resolution', async () => {
            // Arrange
            (mockPrisma.rma.findUnique as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                assetId: 'asset-uuid-1',
                ticketId: 'ticket-uuid-1',
                status: RmaStatus.DIAGNOSED,
                createdAt: new Date()
            });
            (mockPrisma.rmaDiagnosis.findFirst as jest.Mock).mockResolvedValue({
                id: 'diag-uuid-1',
                rmaId: 'rma-uuid-1',
                diagnosis: 'Irreparable damage',
                resolution: ResolutionType.SCRAP,
                createdAt: new Date()
            });
            (mockAssetClient.updateStatus as jest.Mock).mockResolvedValue({
                ...soldAsset,
                status: 'SCRAPPED'
            });
            (mockPrisma.rma.update as jest.Mock).mockResolvedValue({
                id: 'rma-uuid-1',
                status: RmaStatus.RESOLVED
            });
            (mockPrisma.savTicket.findUnique as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                status: TicketStatus.IN_PROGRESS
            });
            (mockPrisma.savTicket.update as jest.Mock).mockResolvedValue({
                id: 'ticket-uuid-1',
                status: TicketStatus.CLOSED
            });

            // Act
            const rma = await service.resolveRma('rma-uuid-1');

            // Assert
            expect(rma.status).toBe(RmaStatus.RESOLVED);
            expect(mockAssetClient.updateStatus).toHaveBeenCalledWith('asset-uuid-1', 'SCRAPPED');
            expect(mockQualityClient.initiateQualityCheck).not.toHaveBeenCalled();
        });
    });
});
