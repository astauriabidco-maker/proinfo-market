/**
 * Quote Service
 * Gestion des devis CTO B2B
 * 
 * RÈGLES CRITIQUES :
 * - Le priceSnapshot est FIGÉ depuis le CTO, jamais recalculé
 * - La conversion devis → commande utilise OrderService existant
 * - Isolation par companyId (un client ne voit que ses devis)
 */

import {
    Quote,
    QuoteStatus,
    CreateQuoteDto,
    QuoteResponse,
    createQuote,
    isQuoteExpired,
    toQuoteResponse
} from '../models/quote.model';
import {
    CtoServiceClient,
    HttpCtoServiceClient
} from '../integrations/cto.client';
import { OrderService, CreateOrderDto, OrderEntity } from './order.service';

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

export class QuoteService {
    private readonly quotes: Map<string, Quote> = new Map();
    private readonly ctoClient: CtoServiceClient;
    private readonly orderService: OrderService;

    constructor(
        ctoClient?: CtoServiceClient,
        orderService?: OrderService
    ) {
        this.ctoClient = ctoClient ?? new HttpCtoServiceClient();
        this.orderService = orderService ?? new OrderService();
    }

    /**
     * Crée un devis à partir d'une configuration CTO validée
     * 
     * RÈGLE : Le priceSnapshot est capturé depuis le CTO et FIGÉ
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
        const quote = createQuote(
            companyId,
            customerRef,
            dto.assetId,
            dto.ctoConfigurationId,
            ctoConfig.priceSnapshot,   // FIGÉ depuis CTO
            ctoConfig.leadTimeDays
        );

        this.quotes.set(quote.id, quote);

        return toQuoteResponse(quote);
    }

    /**
     * Récupère un devis par ID (avec vérification d'accès)
     */
    async getQuote(quoteId: string, companyId: string): Promise<QuoteResponse> {
        const quote = this.quotes.get(quoteId);

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
     * Liste les devis d'une entreprise
     */
    async getCompanyQuotes(companyId: string): Promise<QuoteResponse[]> {
        return Array.from(this.quotes.values())
            .filter(q => q.companyId === companyId)
            .map(toQuoteResponse)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Convertit un devis en commande
     * 
     * RÈGLES :
     * - Le devis ne doit pas être expiré
     * - Le devis ne doit pas être déjà converti
     * - Le priceSnapshot est transmis tel quel à la commande
     */
    async convertToOrder(quoteId: string, companyId: string): Promise<OrderEntity> {
        const quote = this.quotes.get(quoteId);

        if (!quote) {
            throw new QuoteNotFoundError(quoteId);
        }

        // Vérification d'accès
        if (quote.companyId !== companyId) {
            throw new QuoteAccessDeniedError(quoteId);
        }

        // Vérification d'expiration
        if (isQuoteExpired(quote)) {
            quote.status = QuoteStatus.EXPIRED;
            throw new QuoteExpiredError(quoteId);
        }

        // Vérification de conversion
        if (quote.status === QuoteStatus.CONVERTED) {
            throw new QuoteAlreadyConvertedError(quoteId, quote.convertedOrderId ?? '');
        }

        // Créer la commande via OrderService existant
        const order = await this.orderService.createOrder({
            assetId: quote.assetId,
            ctoConfigurationId: quote.ctoConfigurationId,
            customerRef: quote.customerRef
        });

        // Marquer le devis comme converti
        quote.status = QuoteStatus.CONVERTED;
        quote.convertedOrderId = order.id;

        return order;
    }
}
