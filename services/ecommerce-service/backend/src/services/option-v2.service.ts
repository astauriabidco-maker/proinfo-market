/**
 * Option Service V2
 * Sprint 14 - Gestion des options premium avec persistance Prisma
 * 
 * RÈGLES CRITIQUES :
 * - Les options n'impactent PAS le CTO validé
 * - Le prix est FIGÉ au moment de l'ajout
 * - Impossible d'ajouter des options à une commande expédiée
 */

import { OptionRepository } from '../repositories/option.repository';
import {
    OptionEntity,
    OrderOptionEntity,
    OptionResponse,
    OrderOptionsSummary,
    toOptionResponse,
    toOrderOptionResponse,
    calculateOptionsTotal
} from '../domain/option.types';
import { OrderService, OrderEntity, OrderStatus } from './order.service';

/**
 * Erreur : Option non trouvée
 */
export class OptionNotFoundError extends Error {
    constructor(optionId: string) {
        super(`Option ${optionId} not found`);
        this.name = 'OptionNotFoundError';
    }
}

/**
 * Erreur : Option non active
 */
export class OptionNotActiveError extends Error {
    constructor(optionId: string) {
        super(`Option ${optionId} is not active`);
        this.name = 'OptionNotActiveError';
    }
}

/**
 * Erreur : Commande non trouvée
 */
export class OrderNotFoundForOptionsError extends Error {
    constructor(orderId: string) {
        super(`Order ${orderId} not found`);
        this.name = 'OrderNotFoundForOptionsError';
    }
}

/**
 * Erreur : Commande déjà expédiée
 */
export class OrderAlreadyShippedError extends Error {
    constructor(orderId: string) {
        super(`Cannot add options to shipped order ${orderId}`);
        this.name = 'OrderAlreadyShippedError';
    }
}

/**
 * Erreur : Option déjà ajoutée
 */
export class OptionAlreadyAddedError extends Error {
    constructor(orderId: string, optionId: string) {
        super(`Option ${optionId} already added to order ${orderId}`);
        this.name = 'OptionAlreadyAddedError';
    }
}

// Extended order status for shipment check
const SHIPPED_STATUS = 'SHIPPED';

export class OptionServiceV2 {
    private readonly optionRepository: OptionRepository;
    private readonly orderService: OrderService;

    constructor(
        optionRepository: OptionRepository,
        orderService?: OrderService
    ) {
        this.optionRepository = optionRepository;
        this.orderService = orderService ?? new OrderService();
    }

    /**
     * Get active options catalog
     */
    async getActiveOptions(): Promise<OptionResponse[]> {
        const options = await this.optionRepository.findAllActive();
        return options.map(toOptionResponse);
    }

    /**
     * Get option by ID
     */
    async getOption(optionId: string): Promise<OptionResponse> {
        const option = await this.optionRepository.findById(optionId);
        if (!option) {
            throw new OptionNotFoundError(optionId);
        }
        return toOptionResponse(option);
    }

    /**
     * Add options to an order
     * 
     * RÈGLES STRICTES :
     * 1. La commande doit exister
     * 2. La commande ne doit PAS être expédiée
     * 3. Les options doivent être actives
     * 4. Le prix est FIGÉ au moment de l'ajout
     * 
     * ❌ Le priceSnapshot CTO n'est JAMAIS modifié
     */
    async addOptionsToOrder(
        orderId: string,
        optionIds: string[]
    ): Promise<OrderOptionsSummary> {
        // 1. Vérifier que la commande existe
        const order = await this.orderService.getOrder(orderId);
        if (!order) {
            throw new OrderNotFoundForOptionsError(orderId);
        }

        // 2. Vérifier que la commande n'est pas expédiée
        if ((order.status as string) === SHIPPED_STATUS) {
            throw new OrderAlreadyShippedError(orderId);
        }

        // 3. Récupérer et valider les options
        const options = await this.optionRepository.findByIds(optionIds);

        const addedOptions: OrderOptionEntity[] = [];

        for (const optionId of optionIds) {
            const option = options.find(o => o.id === optionId);

            if (!option) {
                throw new OptionNotFoundError(optionId);
            }

            if (!option.active) {
                throw new OptionNotActiveError(optionId);
            }

            // Vérifier si déjà ajoutée
            const alreadyAdded = await this.optionRepository.isOptionOnOrder(orderId, optionId);
            if (alreadyAdded) {
                throw new OptionAlreadyAddedError(orderId, optionId);
            }

            // 4. Ajouter avec prix FIGÉ
            const orderOption = await this.optionRepository.addOptionToOrder(
                orderId,
                optionId,
                option.price  // Prix figé maintenant
            );

            addedOptions.push(orderOption);
        }

        // Récupérer toutes les options de la commande
        const allOrderOptions = await this.optionRepository.getOrderOptions(orderId);

        return {
            options: allOrderOptions.map(toOrderOptionResponse),
            totalOptionsPrice: calculateOptionsTotal(allOrderOptions),
            count: allOrderOptions.length
        };
    }

    /**
     * Get all options for an order
     */
    async getOrderOptions(orderId: string): Promise<OrderOptionsSummary> {
        const orderOptions = await this.optionRepository.getOrderOptions(orderId);

        return {
            options: orderOptions.map(toOrderOptionResponse),
            totalOptionsPrice: calculateOptionsTotal(orderOptions),
            count: orderOptions.length
        };
    }

    /**
     * Seed catalog (for initialization)
     */
    async seedCatalog(): Promise<void> {
        await this.optionRepository.seedCatalog();
    }
}
