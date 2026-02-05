/**
 * Quote Routes
 * Routes pour les devis CTO B2B
 */

import { Router, Request, Response } from 'express';
import { QuoteService, QuoteNotFoundError, QuoteExpiredError, QuoteAlreadyConvertedError, QuoteAccessDeniedError, CtoNotValidatedForQuoteError } from '../services/quote.service';
import { authMiddleware, canOrder, getCompanyId, getCustomerRef } from '../middleware/auth.middleware';

const quoteService = new QuoteService();

export function createQuoteRoutes(): Router {
    const router = Router();

    // Toutes les routes nécessitent une authentification
    router.use(authMiddleware);

    /**
     * POST /quotes
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
     * GET /quotes
     * Liste les devis de l'entreprise
     */
    router.get('/', async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);

        if (!companyId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const quotes = await quoteService.getCompanyQuotes(companyId);
        res.json(quotes);
    });

    /**
     * GET /quotes/:id
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
     * POST /quotes/:id/convert
     * Convertit un devis en commande
     * Requiert: ADMIN_CLIENT ou ACHETEUR
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
            throw error;
        }
    });

    return router;
}
