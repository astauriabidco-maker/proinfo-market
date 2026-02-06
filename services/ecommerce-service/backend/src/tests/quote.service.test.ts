/**
 * Quote Service Tests
 * Sprint 13 - Tests unitaires pour le service de devis CTO B2B
 * 
 * TESTS OBLIGATOIRES (noms exacts du spec) :
 * 1. should_create_quote_from_validated_cto
 * 2. should_not_recalculate_price_on_quote_creation
 * 3. should_not_convert_expired_quote
 * 4. should_convert_active_quote_to_order
 * 5. should_restrict_quote_access_to_company
 */

import { QuoteStatus } from '@prisma/client';
import {
    QuoteServiceV2,
    CtoNotValidatedForQuoteError,
    QuoteExpiredError,
    QuoteAccessDeniedError,
    AssetNotAvailableForQuoteError
} from '../services/quote-v2.service';
import { QuoteRepository } from '../repositories/quote.repository';
import { QuoteEntity, QUOTE_VALIDITY_DAYS } from '../domain/quote.types';
import {
    CtoServiceClient,
    CtoConfigurationResponse,
    PriceSnapshot
} from '../integrations/cto.client';
import {
    InventoryServiceClient,
    AvailabilityResponse,
    ReservationResponse
} from '../integrations/inventory.client';
import { OrderService, OrderEntity, OrderStatus } from '../services/order.service';

// ============================================
// Mock Repository
// ============================================

const createMockRepository = (): jest.Mocked<QuoteRepository> => ({
    create: jest.fn(),
    findById: jest.fn(),
    findByCompany: jest.fn(),
    updateStatus: jest.fn()
} as unknown as jest.Mocked<QuoteRepository>);

// ============================================
// Mock Clients
// ============================================

const createMockCtoClient = (): jest.Mocked<CtoServiceClient> => ({
    validateConfiguration: jest.fn(),
    getConfiguration: jest.fn()
});

const createMockInventoryClient = (): jest.Mocked<InventoryServiceClient> => ({
    checkAvailability: jest.fn(),
    reserveAsset: jest.fn()
});

const createMockOrderService = (): jest.Mocked<OrderService> => ({
    createOrder: jest.fn(),
    getOrder: jest.fn(),
    getOrdersByCustomer: jest.fn(),
    getOrderPrice: jest.fn()
} as unknown as jest.Mocked<OrderService>);

// ============================================
// Test Data
// ============================================

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

const COMPANY_A = 'company-uuid-A';
const COMPANY_B = 'company-uuid-B';
const CUSTOMER_REF = 'CLIENT-ACME';

function createMockQuote(overrides: Partial<QuoteEntity> = {}): QuoteEntity {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + QUOTE_VALIDITY_DAYS);

    return {
        id: 'quote-uuid-1',
        companyId: COMPANY_A,
        customerRef: CUSTOMER_REF,
        assetId: 'asset-uuid-1',
        ctoConfigurationId: 'cto-config-uuid-1',
        priceSnapshot: mockPriceSnapshot,
        leadTimeDays: 2,
        status: QuoteStatus.ACTIVE,
        expiresAt,
        convertedOrderId: null,
        createdAt: now,
        ...overrides
    };
}

function createExpiredQuote(): QuoteEntity {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Expiré hier
    return createMockQuote({ expiresAt: pastDate });
}

// ============================================
// Tests
// ============================================

describe('QuoteServiceV2', () => {
    let service: QuoteServiceV2;
    let mockRepository: jest.Mocked<QuoteRepository>;
    let mockCtoClient: jest.Mocked<CtoServiceClient>;
    let mockInventoryClient: jest.Mocked<InventoryServiceClient>;
    let mockOrderService: jest.Mocked<OrderService>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = createMockRepository();
        mockCtoClient = createMockCtoClient();
        mockInventoryClient = createMockInventoryClient();
        mockOrderService = createMockOrderService();

        service = new QuoteServiceV2(
            mockRepository,
            mockCtoClient,
            mockInventoryClient,
            mockOrderService
        );
    });

    // ========================================
    // TEST 1: should_create_quote_from_validated_cto
    // ========================================
    describe('Quote Creation', () => {
        test('should_create_quote_from_validated_cto', async () => {
            // Arrange - CTO validé
            mockCtoClient.getConfiguration.mockResolvedValue(mockCtoConfig);
            const expectedQuote = createMockQuote();
            mockRepository.create.mockResolvedValue(expectedQuote);

            // Act
            const quote = await service.createQuote(COMPANY_A, CUSTOMER_REF, {
                assetId: 'asset-uuid-1',
                ctoConfigurationId: 'cto-config-uuid-1'
            });

            // Assert
            expect(mockCtoClient.getConfiguration).toHaveBeenCalledWith('cto-config-uuid-1');
            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    companyId: COMPANY_A,
                    customerRef: CUSTOMER_REF,
                    assetId: 'asset-uuid-1',
                    ctoConfigurationId: 'cto-config-uuid-1',
                    priceSnapshot: mockPriceSnapshot,
                    leadTimeDays: 2
                })
            );
            expect(quote.status).toBe(QuoteStatus.ACTIVE);
        });

        test('should_reject_quote_from_non_validated_cto', async () => {
            // Arrange - CTO NON validé
            const invalidCtoConfig = { ...mockCtoConfig, validated: false };
            mockCtoClient.getConfiguration.mockResolvedValue(invalidCtoConfig);

            // Act & Assert
            await expect(
                service.createQuote(COMPANY_A, CUSTOMER_REF, {
                    assetId: 'asset-uuid-1',
                    ctoConfigurationId: 'cto-config-uuid-1'
                })
            ).rejects.toThrow(CtoNotValidatedForQuoteError);

            // Le repository ne doit PAS être appelé
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    // ========================================
    // TEST 2: should_not_recalculate_price_on_quote_creation
    // ========================================
    test('should_not_recalculate_price_on_quote_creation', async () => {
        // Arrange
        mockCtoClient.getConfiguration.mockResolvedValue(mockCtoConfig);
        const createdQuote = createMockQuote();
        mockRepository.create.mockResolvedValue(createdQuote);

        // Act
        const quote = await service.createQuote(COMPANY_A, CUSTOMER_REF, {
            assetId: 'asset-uuid-1',
            ctoConfigurationId: 'cto-config-uuid-1'
        });

        // Assert - Le prix doit être IDENTIQUE au snapshot CTO
        expect(quote.priceSnapshot).toEqual(mockPriceSnapshot);
        expect(quote.priceSnapshot.total).toBe(1215.4);
        expect(quote.priceSnapshot.frozenAt).toBe('2026-02-04T23:00:00Z');

        // Vérifier qu'AUCUN appel pricing n'a été fait
        // (getConfiguration ne fait que récupérer, pas recalculer)
        expect(mockCtoClient.getConfiguration).toHaveBeenCalledTimes(1);
        expect(mockCtoClient.validateConfiguration).not.toHaveBeenCalled();
    });

    // ========================================
    // TEST 3: should_not_convert_expired_quote
    // ========================================
    test('should_not_convert_expired_quote', async () => {
        // Arrange - Devis expiré
        const expiredQuote = createExpiredQuote();
        mockRepository.findById.mockResolvedValue(expiredQuote);
        mockRepository.updateStatus.mockResolvedValue({
            ...expiredQuote,
            status: QuoteStatus.EXPIRED
        });

        // Act & Assert
        await expect(
            service.convertToOrder('quote-uuid-1', COMPANY_A)
        ).rejects.toThrow(QuoteExpiredError);

        // Le devis doit être marqué comme EXPIRED
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
            'quote-uuid-1',
            QuoteStatus.EXPIRED
        );

        // Aucune vérification Inventory ni création commande
        expect(mockInventoryClient.checkAvailability).not.toHaveBeenCalled();
        expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });

    // ========================================
    // TEST 4: should_convert_active_quote_to_order
    // ========================================
    test('should_convert_active_quote_to_order', async () => {
        // Arrange - Devis actif
        const activeQuote = createMockQuote();
        mockRepository.findById.mockResolvedValue(activeQuote);

        // Inventory disponible
        mockInventoryClient.checkAvailability.mockResolvedValue({
            assetId: 'asset-uuid-1',
            available: true,
            status: 'SELLABLE',
            reserved: false
        } as AvailabilityResponse);

        // Commande créée
        const createdOrder: OrderEntity = {
            id: 'order-uuid-1',
            assetId: 'asset-uuid-1',
            ctoConfigurationId: 'cto-config-uuid-1',
            customerRef: CUSTOMER_REF,
            priceSnapshot: mockPriceSnapshot,
            leadTimeDays: 2,
            status: OrderStatus.RESERVED,
            reservationId: 'reservation-uuid-1',
            createdAt: new Date()
        };
        mockOrderService.createOrder.mockResolvedValue(createdOrder);

        // Update status
        mockRepository.updateStatus.mockResolvedValue({
            ...activeQuote,
            status: QuoteStatus.CONVERTED,
            convertedOrderId: 'order-uuid-1'
        });

        // Act
        const order = await service.convertToOrder('quote-uuid-1', COMPANY_A);

        // Assert
        expect(mockInventoryClient.checkAvailability).toHaveBeenCalledWith('asset-uuid-1');
        expect(mockOrderService.createOrder).toHaveBeenCalledWith({
            assetId: 'asset-uuid-1',
            ctoConfigurationId: 'cto-config-uuid-1',
            customerRef: CUSTOMER_REF
        });
        expect(mockRepository.updateStatus).toHaveBeenCalledWith(
            'quote-uuid-1',
            QuoteStatus.CONVERTED,
            'order-uuid-1'
        );
        expect(order.id).toBe('order-uuid-1');
        expect(order.priceSnapshot.total).toBe(1215.4);
    });

    test('should_fail_conversion_if_asset_not_available', async () => {
        // Arrange
        const activeQuote = createMockQuote();
        mockRepository.findById.mockResolvedValue(activeQuote);

        // Inventory NON disponible
        mockInventoryClient.checkAvailability.mockResolvedValue({
            assetId: 'asset-uuid-1',
            available: false,
            status: 'RESERVED',
            reserved: true
        } as AvailabilityResponse);

        // Act & Assert
        await expect(
            service.convertToOrder('quote-uuid-1', COMPANY_A)
        ).rejects.toThrow(AssetNotAvailableForQuoteError);

        // Aucune commande créée
        expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });

    // ========================================
    // TEST 5: should_restrict_quote_access_to_company
    // ========================================
    test('should_restrict_quote_access_to_company', async () => {
        // Arrange - Devis appartenant à COMPANY_A
        const quoteFromCompanyA = createMockQuote({ companyId: COMPANY_A });
        mockRepository.findById.mockResolvedValue(quoteFromCompanyA);

        // Act & Assert - COMPANY_B essaie d'accéder
        await expect(
            service.getQuote('quote-uuid-1', COMPANY_B)
        ).rejects.toThrow(QuoteAccessDeniedError);

        // Même pour la conversion
        await expect(
            service.convertToOrder('quote-uuid-1', COMPANY_B)
        ).rejects.toThrow(QuoteAccessDeniedError);
    });

    test('should_allow_company_to_access_own_quote', async () => {
        // Arrange
        const quoteFromCompanyA = createMockQuote({ companyId: COMPANY_A });
        mockRepository.findById.mockResolvedValue(quoteFromCompanyA);

        // Act - COMPANY_A accède à son propre devis
        const quote = await service.getQuote('quote-uuid-1', COMPANY_A);

        // Assert
        expect(quote.id).toBe('quote-uuid-1');
    });

    // ========================================
    // Listing Tests
    // ========================================
    describe('Quote Listing', () => {
        test('should_list_only_company_quotes', async () => {
            // Arrange
            const companyQuotes = [
                createMockQuote({ id: 'quote-1' }),
                createMockQuote({ id: 'quote-2' })
            ];
            mockRepository.findByCompany.mockResolvedValue(companyQuotes);

            // Act
            const quotes = await service.getCompanyQuotes(COMPANY_A);

            // Assert
            expect(mockRepository.findByCompany).toHaveBeenCalledWith(COMPANY_A, undefined);
            expect(quotes).toHaveLength(2);
        });

        test('should_apply_filters', async () => {
            // Arrange
            mockRepository.findByCompany.mockResolvedValue([]);

            // Act
            await service.getCompanyQuotes(COMPANY_A, { status: QuoteStatus.ACTIVE });

            // Assert
            expect(mockRepository.findByCompany).toHaveBeenCalledWith(
                COMPANY_A,
                { status: QuoteStatus.ACTIVE }
            );
        });
    });
});
