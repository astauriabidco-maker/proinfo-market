/**
 * Quote Service V2
 * Sprint 13 - Gestion des devis CTO B2B avec persistance Prisma
 * 
 * RÈGLES CRITIQUES :
 * - Le priceSnapshot est FIGÉ depuis le CTO, jamais recalculé
 * - La conversion devis → commande vérifie l'Inventory en temps réel
 * - Isolation par companyId (un client ne voit que ses devis)
 */

import { QuoteStatus } from '@prisma/client';
import { QuoteRepository } from '../repositories/quote.repository';
import {
    QuoteEntity,
    QuoteFilters,
    QuoteResponse,
    calculateExpirationDate,
    isQuoteExpired,
    toQuoteResponse
} from '../domain/quote.types';
import {
    CtoServiceClient,
    HttpCtoServiceClient
} from '../integrations/cto.client';
import {
    InventoryServiceClient,
    HttpInventoryServiceClient
} from '../integrations/inventory.client';
import { OrderService, OrderEntity } from './order.service';

/**
 * DTO pour créer un devis
 */
export interface CreateQuoteDto {
    assetId: string;
    ctoConfigurationId: string;
}

/**
 * Erreur : Configuration CTO non validée
 */
export class CtoNotValidatedForQuoteError extends Error {
    constructor(configurationId: string) {
        super(`CTO configuration ${configurationId} is not validated for quote`);
        this.name = 'CtoNotValidatedForQuoteError';
    }
}

/**
 * Erreur : Devis non trouvé
 */
export class QuoteNotFoundError extends Error {
    constructor(quoteId: string) {
        super(`Quote ${quoteId} not found`);
        this.name = 'QuoteNotFoundError';
    }
}

/**
 * Erreur : Devis expiré
 */
export class QuoteExpiredError extends Error {
    constructor(quoteId: string) {
        super(`Quote ${quoteId} has expired`);
        this.name = 'QuoteExpiredError';
    }
}

/**
 * Erreur : Devis déjà converti
 */
export class QuoteAlreadyConvertedError extends Error {
    constructor(quoteId: string, orderId: string) {
        super(`Quote ${quoteId} has already been converted to order ${orderId}`);
        this.name = 'QuoteAlreadyConvertedError';
    }
}

/**
 * Erreur : Accès refusé
 */
export class QuoteAccessDeniedError extends Error {
    constructor(quoteId: string) {
        super(`Access denied to quote ${quoteId}`);
        this.name = 'QuoteAccessDeniedError';
    }
}

/**
 * Erreur : Asset non disponible
 */
export class AssetNotAvailableForQuoteError extends Error {
    constructor(assetId: string) {
        super(`Asset ${assetId} is not available for conversion`);
        this.name = 'AssetNotAvailableForQuoteError';
    }
}

export class QuoteServiceV2 {
    private readonly quoteRepository: QuoteRepository;
    private readonly ctoClient: CtoServiceClient;
    private readonly inventoryClient: InventoryServiceClient;
    private readonly orderService: OrderService;

    constructor(
        quoteRepository: QuoteRepository,
        ctoClient?: CtoServiceClient,
        inventoryClient?: InventoryServiceClient,
        orderService?: OrderService
    ) {
        this.quoteRepository = quoteRepository;
        this.ctoClient = ctoClient ?? new HttpCtoServiceClient();
        this.inventoryClient = inventoryClient ?? new HttpInventoryServiceClient();
        this.orderService = orderService ?? new OrderService();
    }

    /**
     * Crée un devis à partir d'une configuration CTO validée
     * 
     * RÈGLE : Le priceSnapshot est capturé depuis le CTO et FIGÉ
     * AUCUN recalcul, AUCUN appel pricing
     */
    async createQuote(
        companyId: string,
        customerRef: string,
        dto: CreateQuoteDto
    ): Promise<QuoteResponse> {
        // Récupérer et vérifier la configuration CTO
        const ctoConfig = await this.ctoClient.getConfiguration(dto.ctoConfigurationId);

        if (!ctoConfig.validated) {
            throw new CtoNotValidatedForQuoteError(dto.ctoConfigurationId);
        }

        if (ctoConfig.assetId !== dto.assetId) {
            throw new CtoNotValidatedForQuoteError(dto.ctoConfigurationId);
        }

        // Créer le devis avec le priceSnapshot FIGÉ
        const quote = await this.quoteRepository.create({
            companyId,
            customerRef,
            assetId: dto.assetId,
            ctoConfigurationId: dto.ctoConfigurationId,
            priceSnapshot: ctoConfig.priceSnapshot,   // FIGÉ depuis CTO
            leadTimeDays: ctoConfig.leadTimeDays,
            expiresAt: calculateExpirationDate()
        });

        return toQuoteResponse(quote);
    }

    /**
     * Récupère un devis par ID (avec vérification d'accès)
     */
    async getQuote(quoteId: string, companyId: string): Promise<QuoteResponse> {
        const quote = await this.quoteRepository.findById(quoteId);

        if (!quote) {
            throw new QuoteNotFoundError(quoteId);
        }

        // Vérification d'isolation : seule l'entreprise propriétaire peut voir
        if (quote.companyId !== companyId) {
            throw new QuoteAccessDeniedError(quoteId);
        }

        return toQuoteResponse(quote);
    }

    /**
     * Liste les devis d'une entreprise avec filtres optionnels
     */
    async getCompanyQuotes(
        companyId: string,
        filters?: QuoteFilters
    ): Promise<QuoteResponse[]> {
        const quotes = await this.quoteRepository.findByCompany(companyId, filters);
        return quotes.map(toQuoteResponse);
    }

    /**
     * Convertit un devis en commande
     * 
     * RÈGLES STRICTES :
     * 1. Le devis doit être ACTIVE
     * 2. Le devis ne doit pas être expiré
     * 3. Vérifier la disponibilité Inventory AU MOMENT de la conversion
     * 4. Réserver l'Asset via OrderService
     * 5. Passer le devis à CONVERTED
     * 
     * AUCUN recalcul CTO, AUCUN changement de prix
     */
    async convertToOrder(quoteId: string, companyId: string): Promise<OrderEntity> {
        const quote = await this.quoteRepository.findById(quoteId);

        if (!quote) {
            throw new QuoteNotFoundError(quoteId);
        }

        // Vérification d'accès
        if (quote.companyId !== companyId) {
            throw new QuoteAccessDeniedError(quoteId);
        }

        // Vérification de statut
        if (quote.status === QuoteStatus.CONVERTED) {
            throw new QuoteAlreadyConvertedError(quoteId, quote.convertedOrderId ?? '');
        }

        // Vérification d'expiration
        if (isQuoteExpired(quote)) {
            await this.quoteRepository.updateStatus(quoteId, QuoteStatus.EXPIRED);
            throw new QuoteExpiredError(quoteId);
        }

        // Vérification de disponibilité Inventory AU MOMENT de la conversion
        const availability = await this.inventoryClient.checkAvailability(quote.assetId);
        if (!availability.available) {
            throw new AssetNotAvailableForQuoteError(quote.assetId);
        }

        // Créer la commande via OrderService existant (Sprint 7)
        // Le OrderService gère la réservation
        const order = await this.orderService.createOrder({
            assetId: quote.assetId,
            ctoConfigurationId: quote.ctoConfigurationId,
            customerRef: quote.customerRef
        });

        // Marquer le devis comme converti
        await this.quoteRepository.updateStatus(quoteId, QuoteStatus.CONVERTED, order.id);

        return order;
    }
}
