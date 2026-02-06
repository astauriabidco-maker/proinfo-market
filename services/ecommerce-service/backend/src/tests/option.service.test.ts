/**
 * Option Service Tests
 * Sprint 14 - Tests unitaires pour les options premium
 * 
 * 4 tests obligatoires avec noms exacts :
 * - should_list_active_options
 * - should_add_option_to_order_without_changing_cto_price
 * - should_not_add_option_to_shipped_order
 * - should_freeze_option_price_on_add
 */

import { Decimal } from '@prisma/client/runtime/library';
import {
    OptionServiceV2,
    OptionNotFoundError,
    OrderNotFoundForOptionsError,
    OrderAlreadyShippedError
} from '../services/option-v2.service';
import { OptionRepository } from '../repositories/option.repository';
import { OrderService, OrderEntity, OrderStatus } from '../services/order.service';
import { OptionEntity } from '../domain/option.types';
import { PriceSnapshot } from '../integrations/cto.client';

// Mock du repository
const mockOptionRepository = {
    findAllActive: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
    addOptionToOrder: jest.fn(),
    getOrderOptions: jest.fn(),
    isOptionOnOrder: jest.fn(),
    seedCatalog: jest.fn()
};

// Mock du order service
const mockOrderService = {
    getOrder: jest.fn(),
    createOrder: jest.fn()
};

// Mock options
const WARRANTY_3Y_OPTION: OptionEntity = {
    id: 'opt-warranty-3y',
    name: 'Extension garantie 3 ans',
    category: 'WARRANTY',
    description: 'Extension garantie pièces et main d\'œuvre',
    price: new Decimal(199.00),
    active: true,
    createdAt: new Date()
};

const WARRANTY_5Y_OPTION: OptionEntity = {
    id: 'opt-warranty-5y',
    name: 'Extension garantie 5 ans',
    category: 'WARRANTY',
    description: 'Extension garantie 5 ans avec intervention sur site',
    price: new Decimal(349.00),
    active: true,
    createdAt: new Date()
};

const INACTIVE_OPTION: OptionEntity = {
    id: 'opt-inactive',
    name: 'Option désactivée',
    category: 'SERVICE',
    description: 'Cette option n\'est plus disponible',
    price: new Decimal(99.00),
    active: false,
    createdAt: new Date()
};

// Mock order with frozen CTO price
const mockPriceSnapshot: PriceSnapshot = {
    components: [
        { type: 'CPU', reference: 'XEON-2288G', unitPrice: 500, quantity: 2, lineTotal: 1000 },
        { type: 'RAM', reference: 'DDR4-32G', unitPrice: 150, quantity: 8, lineTotal: 1200 }
    ],
    laborCost: 150,
    subtotal: 2350,
    margin: 0.25,
    total: 2937.5,
    currency: 'EUR',
    frozenAt: new Date().toISOString()
};

const PENDING_ORDER: OrderEntity = {
    id: 'order-1',
    assetId: 'asset-1',
    ctoConfigurationId: 'cto-config-1',
    customerRef: 'CUST-001',
    priceSnapshot: mockPriceSnapshot,
    leadTimeDays: 5,
    status: OrderStatus.CONFIRMED,
    createdAt: new Date()
};

describe('OptionServiceV2', () => {
    let optionService: OptionServiceV2;

    beforeEach(() => {
        jest.clearAllMocks();

        optionService = new OptionServiceV2(
            mockOptionRepository as unknown as OptionRepository,
            mockOrderService as unknown as OrderService
        );
    });

    /**
     * TEST 1: should_list_active_options
     * Vérifie que seules les options actives sont retournées
     */
    it('should_list_active_options', async () => {
        // Arrange - Le repository retourne les options actives
        mockOptionRepository.findAllActive.mockResolvedValue([
            WARRANTY_3Y_OPTION,
            WARRANTY_5Y_OPTION
        ]);

        // Act
        const result = await optionService.getActiveOptions();

        // Assert
        expect(result).toHaveLength(2);
        expect(result[0]?.name).toBe('Extension garantie 3 ans');
        expect(result[0]?.price).toBe(199);
        expect(result[1]?.name).toBe('Extension garantie 5 ans');
        expect(result[1]?.price).toBe(349);

        // L'option inactive n'est PAS dans la liste
        expect(result.find(o => o.id === INACTIVE_OPTION.id)).toBeUndefined();
    });

    /**
     * TEST 2: should_add_option_to_order_without_changing_cto_price
     * Vérifie que l'ajout d'options ne modifie JAMAIS le priceSnapshot CTO
     */
    it('should_add_option_to_order_without_changing_cto_price', async () => {
        // Arrange
        const originalPriceSnapshot = { ...mockPriceSnapshot };

        mockOrderService.getOrder.mockResolvedValue(PENDING_ORDER);
        mockOptionRepository.findByIds.mockResolvedValue([WARRANTY_3Y_OPTION]);
        mockOptionRepository.isOptionOnOrder.mockResolvedValue(false);
        mockOptionRepository.addOptionToOrder.mockResolvedValue({
            id: 'order-opt-1',
            orderId: PENDING_ORDER.id,
            optionId: WARRANTY_3Y_OPTION.id,
            price: WARRANTY_3Y_OPTION.price,
            createdAt: new Date(),
            option: WARRANTY_3Y_OPTION
        });
        mockOptionRepository.getOrderOptions.mockResolvedValue([{
            id: 'order-opt-1',
            orderId: PENDING_ORDER.id,
            optionId: WARRANTY_3Y_OPTION.id,
            price: WARRANTY_3Y_OPTION.price,
            createdAt: new Date(),
            option: WARRANTY_3Y_OPTION
        }]);

        // Act
        const result = await optionService.addOptionsToOrder(
            PENDING_ORDER.id,
            [WARRANTY_3Y_OPTION.id]
        );

        // Assert - Options ajoutées
        expect(result.count).toBe(1);
        expect(result.totalOptionsPrice).toBe(199);

        // Assert CRITICAL : Le priceSnapshot CTO n'a PAS été modifié
        expect(PENDING_ORDER.priceSnapshot.total).toBe(originalPriceSnapshot.total);
        expect(PENDING_ORDER.priceSnapshot).toEqual(originalPriceSnapshot);
    });

    /**
     * TEST 3: should_not_add_option_to_shipped_order
     * Vérifie qu'on ne peut PAS ajouter d'options à une commande expédiée
     */
    it('should_not_add_option_to_shipped_order', async () => {
        // Arrange - Commande expédiée
        const shippedOrder: OrderEntity = {
            ...PENDING_ORDER,
            id: 'order-shipped',
            status: 'SHIPPED' as OrderStatus
        };

        mockOrderService.getOrder.mockResolvedValue(shippedOrder);

        // Act & Assert
        await expect(
            optionService.addOptionsToOrder(shippedOrder.id, [WARRANTY_3Y_OPTION.id])
        ).rejects.toThrow(OrderAlreadyShippedError);

        // Verify - Aucune option n'a été ajoutée
        expect(mockOptionRepository.addOptionToOrder).not.toHaveBeenCalled();
    });

    /**
     * TEST 4: should_freeze_option_price_on_add
     * Vérifie que le prix est FIGÉ au moment de l'ajout
     */
    it('should_freeze_option_price_on_add', async () => {
        // Arrange
        mockOrderService.getOrder.mockResolvedValue(PENDING_ORDER);
        mockOptionRepository.findByIds.mockResolvedValue([WARRANTY_3Y_OPTION]);
        mockOptionRepository.isOptionOnOrder.mockResolvedValue(false);
        mockOptionRepository.addOptionToOrder.mockImplementation(
            async (orderId, optionId, frozenPrice) => ({
                id: 'order-opt-frozen',
                orderId,
                optionId,
                price: frozenPrice,  // Le prix passé est celui FIGÉ
                createdAt: new Date(),
                option: WARRANTY_3Y_OPTION
            })
        );
        mockOptionRepository.getOrderOptions.mockResolvedValue([{
            id: 'order-opt-frozen',
            orderId: PENDING_ORDER.id,
            optionId: WARRANTY_3Y_OPTION.id,
            price: new Decimal(199.00),  // Prix figé
            createdAt: new Date(),
            option: WARRANTY_3Y_OPTION
        }]);

        // Act
        await optionService.addOptionsToOrder(PENDING_ORDER.id, [WARRANTY_3Y_OPTION.id]);

        // Assert - Le repository a été appelé avec le prix ACTUEL de l'option
        expect(mockOptionRepository.addOptionToOrder).toHaveBeenCalledWith(
            PENDING_ORDER.id,
            WARRANTY_3Y_OPTION.id,
            WARRANTY_3Y_OPTION.price  // Prix figé au moment de l'ajout
        );
    });

    /**
     * TEST supplémentaire : should_not_add_inactive_option
     */
    it('should_throw_when_option_not_found', async () => {
        // Arrange
        mockOrderService.getOrder.mockResolvedValue(PENDING_ORDER);
        mockOptionRepository.findByIds.mockResolvedValue([]);  // Option non trouvée

        // Act & Assert
        await expect(
            optionService.addOptionsToOrder(PENDING_ORDER.id, ['non-existent'])
        ).rejects.toThrow(OptionNotFoundError);
    });

    /**
     * TEST supplémentaire : should_throw_when_order_not_found
     */
    it('should_throw_when_order_not_found', async () => {
        // Arrange
        mockOrderService.getOrder.mockResolvedValue(null);

        // Act & Assert
        await expect(
            optionService.addOptionsToOrder('non-existent', [WARRANTY_3Y_OPTION.id])
        ).rejects.toThrow(OrderNotFoundForOptionsError);
    });
});
