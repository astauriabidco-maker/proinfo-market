/**
 * Quote Routes V2
 * Sprint 13 - Routes pour les devis CTO B2B avec persistance Prisma
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, QuoteStatus } from '@prisma/client';
import { QuoteRepository } from '../repositories/quote.repository';
import {
    QuoteServiceV2,
    QuoteNotFoundError,
    QuoteExpiredError,
    QuoteAlreadyConvertedError,
    QuoteAccessDeniedError,
    CtoNotValidatedForQuoteError,
    AssetNotAvailableForQuoteError
} from '../services/quote-v2.service';
import { QuoteFilters } from '../domain/quote.types';
import { authMiddleware, canOrder, getCompanyId, getCustomerRef } from '../middleware/auth.middleware';

export function createQuoteRoutesV2(prisma: PrismaClient): Router {
    const router = Router();
    const quoteRepository = new QuoteRepository(prisma);
    const quoteService = new QuoteServiceV2(quoteRepository);

    // Toutes les routes nécessitent une authentification
    router.use(authMiddleware);

    /**
     * POST /v2/quotes
     * Créer un devis depuis une configuration CTO validée
     * Requiert: ADMIN_CLIENT ou ACHETEUR
     */
    router.post('/', canOrder, async (req: Request, res: Response) => {
        try {
            const companyId = getCompanyId(req);
            const customerRef = getCustomerRef(req);

            if (!companyId || !customerRef) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { assetId, ctoConfigurationId } = req.body;

            if (!assetId || !ctoConfigurationId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'assetId and ctoConfigurationId are required'
                });
                return;
            }

            const quote = await quoteService.createQuote(companyId, customerRef, {
                assetId,
                ctoConfigurationId
            });

            res.status(201).json(quote);
        } catch (error) {
            if (error instanceof CtoNotValidatedForQuoteError) {
                res.status(400).json({
                    error: 'CtoNotValidated',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/quotes
     * Liste les devis de l'entreprise avec filtres optionnels
     * 
     * Query params:
     * - status: ACTIVE | EXPIRED | CONVERTED
     * - expiresAfter: ISO date string
     * - expiresBefore: ISO date string
     */
    router.get('/', async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);

        if (!companyId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Parse filters from query params
        const filters: QuoteFilters = {};

        if (req.query.status && typeof req.query.status === 'string') {
            const status = req.query.status.toUpperCase();
            if (['ACTIVE', 'EXPIRED', 'CONVERTED'].includes(status)) {
                filters.status = status as QuoteStatus;
            }
        }

        if (req.query.expiresAfter && typeof req.query.expiresAfter === 'string') {
            const date = new Date(req.query.expiresAfter);
            if (!isNaN(date.getTime())) {
                filters.expiresAfter = date;
            }
        }

        if (req.query.expiresBefore && typeof req.query.expiresBefore === 'string') {
            const date = new Date(req.query.expiresBefore);
            if (!isNaN(date.getTime())) {
                filters.expiresBefore = date;
            }
        }

        const quotes = await quoteService.getCompanyQuotes(companyId, filters);
        res.json(quotes);
    });

    /**
     * GET /v2/quotes/:id
     * Récupère un devis
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const companyId = getCompanyId(req);

            if (!companyId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const quote = await quoteService.getQuote(req.params.id ?? '', companyId);
            res.json(quote);
        } catch (error) {
            if (error instanceof QuoteNotFoundError) {
                res.status(404).json({ error: 'NotFound', message: error.message });
                return;
            }
            if (error instanceof QuoteAccessDeniedError) {
                res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /v2/quotes/:id/convert
     * Convertit un devis en commande
     * Requiert: ADMIN_CLIENT ou ACHETEUR
     * 
     * RÈGLES :
     * - Vérifie l'expiration
     * - Vérifie la disponibilité Inventory
     * - Aucun recalcul CTO
     */
    router.post('/:id/convert', canOrder, async (req: Request, res: Response) => {
        try {
            const companyId = getCompanyId(req);

            if (!companyId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const order = await quoteService.convertToOrder(req.params.id ?? '', companyId);

            res.json({
                message: 'Quote successfully converted to order',
                orderId: order.id,
                status: order.status,
                priceTotal: order.priceSnapshot.total
            });
        } catch (error) {
            if (error instanceof QuoteNotFoundError) {
                res.status(404).json({ error: 'NotFound', message: error.message });
                return;
            }
            if (error instanceof QuoteAccessDeniedError) {
                res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
                return;
            }
            if (error instanceof QuoteExpiredError) {
                res.status(410).json({ error: 'QuoteExpired', message: error.message });
                return;
            }
            if (error instanceof QuoteAlreadyConvertedError) {
                res.status(409).json({ error: 'AlreadyConverted', message: error.message });
                return;
            }
            if (error instanceof AssetNotAvailableForQuoteError) {
                res.status(409).json({ error: 'AssetNotAvailable', message: error.message });
                return;
            }
            throw error;
        }
    });

    return router;
}
