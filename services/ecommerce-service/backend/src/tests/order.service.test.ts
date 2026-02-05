/**
 * Order Service Tests
 * Tests unitaires pour le service de commandes
 */

import {
    OrderService,
    CtoNotValidatedError,
    AssetNotAvailableError,
    OrderStatus
} from '../services/order.service';
import {
    InventoryServiceClient,
    AvailabilityResponse,
    ReservationResponse
} from '../integrations/inventory.client';
import {
    CtoServiceClient,
    CtoConfigurationResponse,
    PriceSnapshot
} from '../integrations/cto.client';

// Mock des clients
const mockInventoryClient: InventoryServiceClient = {
    checkAvailability: jest.fn(),
    reserveAsset: jest.fn()
};

const mockCtoClient: CtoServiceClient = {
    validateConfiguration: jest.fn(),
    getConfiguration: jest.fn()
};

// Mock des événements
jest.spyOn(console, 'log').mockImplementation(() => { });

// Données de test
const mockPriceSnapshot: PriceSnapshot = {
    components: [
        { type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2, unitPrice: 500, lineTotal: 1000 }
    ],
    laborCost: 30,
    subtotal: 1000,
    margin: 185.4,
    total: 1215.4,
    currency: 'EUR',
    frozenAt: '2026-02-04T23:00:00Z'
};

const mockCtoConfig: CtoConfigurationResponse = {
    id: 'cto-config-uuid-1',
    assetId: 'asset-uuid-1',
    configuration: [{ type: 'CPU', reference: 'XEON-GOLD-6230', quantity: 2 }],
    priceSnapshot: mockPriceSnapshot,
    leadTimeDays: 2,
    ruleSetId: 'ruleset-uuid-1',
    validated: true,
    createdAt: '2026-02-04T23:00:00Z',
    assemblyOrder: {
        assetId: 'asset-uuid-1',
        tasks: ['INSTALL_CPU', 'RUN_QA']
    }
};

describe('OrderService', () => {
    let service: OrderService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new OrderService(mockInventoryClient, mockCtoClient);
    });

    describe('Order Creation', () => {
        test('should_create_order_only_if_cto_validated', async () => {
            // Arrange - CTO non validé
            const invalidCtoConfig: CtoConfigurationResponse = {
                ...mockCtoConfig,
                validated: false
            };
            (mockCtoClient.getConfiguration as jest.Mock).mockResolvedValue(invalidCtoConfig);

            // Act & Assert
            await expect(
                service.createOrder({
                    assetId: 'asset-uuid-1',
                    ctoConfigurationId: 'cto-config-uuid-1',
                    customerRef: 'CLIENT-ACME'
                })
            ).rejects.toThrow(CtoNotValidatedError);

            // Vérifier que les autres services n'ont pas été appelés
            expect(mockInventoryClient.checkAvailability).not.toHaveBeenCalled();
            expect(mockInventoryClient.reserveAsset).not.toHaveBeenCalled();
        });

        test('should_reserve_asset_before_confirming_order', async () => {
            // Arrange
            (mockCtoClient.getConfiguration as jest.Mock).mockResolvedValue(mockCtoConfig);
            (mockInventoryClient.checkAvailability as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                available: true,
                status: 'SELLABLE',
                reserved: false
            } as AvailabilityResponse);
            (mockInventoryClient.reserveAsset as jest.Mock).mockResolvedValue({
                id: 'reservation-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'order-uuid-1',
                createdAt: '2026-02-04T23:00:00Z'
            } as ReservationResponse);

            // Act
            const order = await service.createOrder({
                assetId: 'asset-uuid-1',
                ctoConfigurationId: 'cto-config-uuid-1',
                customerRef: 'CLIENT-ACME'
            });

            // Assert
            expect(order.status).toBe(OrderStatus.RESERVED);
            expect(order.reservationId).toBe('reservation-uuid-1');
            expect(mockInventoryClient.reserveAsset).toHaveBeenCalledWith(
                'asset-uuid-1',
                expect.any(String) // orderId généré
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('OrderCreated')
            );
            expect(console.log).toHaveBeenCalledWith(
                '[EVENT]',
                expect.stringContaining('OrderReservationConfirmed')
            );
        });

        test('should_fail_order_if_asset_not_available', async () => {
            // Arrange
            (mockCtoClient.getConfiguration as jest.Mock).mockResolvedValue(mockCtoConfig);
            (mockInventoryClient.checkAvailability as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                available: false, // NON DISPONIBLE
                status: 'RESERVED',
                reserved: true
            } as AvailabilityResponse);

            // Act & Assert
            await expect(
                service.createOrder({
                    assetId: 'asset-uuid-1',
                    ctoConfigurationId: 'cto-config-uuid-1',
                    customerRef: 'CLIENT-ACME'
                })
            ).rejects.toThrow(AssetNotAvailableError);

            // Vérifier que la réservation n'a pas été tentée
            expect(mockInventoryClient.reserveAsset).not.toHaveBeenCalled();
        });

        test('should_not_modify_cto_price', async () => {
            // Arrange
            (mockCtoClient.getConfiguration as jest.Mock).mockResolvedValue(mockCtoConfig);
            (mockInventoryClient.checkAvailability as jest.Mock).mockResolvedValue({
                assetId: 'asset-uuid-1',
                available: true,
                status: 'SELLABLE',
                reserved: false
            } as AvailabilityResponse);
            (mockInventoryClient.reserveAsset as jest.Mock).mockResolvedValue({
                id: 'reservation-uuid-1',
                assetId: 'asset-uuid-1',
                orderRef: 'order-uuid-1',
                createdAt: '2026-02-04T23:00:00Z'
            } as ReservationResponse);

            // Act
            const order = await service.createOrder({
                assetId: 'asset-uuid-1',
                ctoConfigurationId: 'cto-config-uuid-1',
                customerRef: 'CLIENT-ACME'
            });

            // Assert - Le prix doit être identique au CTO, non modifié
            expect(order.priceSnapshot).toEqual(mockPriceSnapshot);
            expect(order.priceSnapshot.total).toBe(1215.4);
            expect(order.priceSnapshot.frozenAt).toBe('2026-02-04T23:00:00Z');

            // Vérifier via getOrderPrice
            const retrievedPrice = await service.getOrderPrice(order.id);
            expect(retrievedPrice).toEqual(mockPriceSnapshot);
        });
    });

    describe('Order Retrieval', () => {
        test('should_return_null_for_unknown_order', async () => {
            const order = await service.getOrder('unknown-uuid');
            expect(order).toBeNull();
        });
    });
});
