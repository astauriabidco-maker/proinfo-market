/**
 * Option Routes V2
 * Sprint 14 - Routes pour les options premium avec persistance Prisma
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { OptionRepository } from '../repositories/option.repository';
import {
    OptionServiceV2,
    OptionNotFoundError,
    OptionNotActiveError,
    OrderNotFoundForOptionsError,
    OrderAlreadyShippedError,
    OptionAlreadyAddedError
} from '../services/option-v2.service';
import { authMiddleware, canOrder, getCompanyId } from '../middleware/auth.middleware';

export function createOptionRoutesV2(prisma: PrismaClient): Router {
    const router = Router();
    const optionRepository = new OptionRepository(prisma);
    const optionService = new OptionServiceV2(optionRepository);

    /**
     * GET /v2/options
     * Liste le catalogue d'options actives
     * Public (pas d'auth requise pour le catalogue)
     */
    router.get('/', async (_req: Request, res: Response) => {
        const options = await optionService.getActiveOptions();
        res.json(options);
    });

    /**
     * GET /v2/options/:id
     * Récupère une option par ID
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const option = await optionService.getOption(req.params.id ?? '');
            res.json(option);
        } catch (error) {
            if (error instanceof OptionNotFoundError) {
                res.status(404).json({ error: 'NotFound', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /v2/options/seed
     * Initialise le catalogue (admin only, dev)
     */
    router.post('/seed', async (_req: Request, res: Response) => {
        await optionService.seedCatalog();
        res.json({ message: 'Catalog seeded successfully' });
    });

    return router;
}

export function createOrderOptionRoutesV2(prisma: PrismaClient): Router {
    const router = Router();
    const optionRepository = new OptionRepository(prisma);
    const optionService = new OptionServiceV2(optionRepository);

    // Auth required for order operations
    router.use(authMiddleware);

    /**
     * POST /v2/orders/:orderId/options
     * Ajoute des options à une commande
     * Requiert: ADMIN_CLIENT ou ACHETEUR
     * 
     * RÈGLES :
     * - La commande ne doit pas être expédiée
     * - Le prix est figé au moment de l'ajout
     * - Le priceSnapshot CTO n'est PAS modifié
     */
    router.post('/:orderId/options', canOrder, async (req: Request, res: Response) => {
        try {
            const companyId = getCompanyId(req);

            if (!companyId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { optionIds } = req.body;

            if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'optionIds must be a non-empty array'
                });
                return;
            }

            const result = await optionService.addOptionsToOrder(
                req.params.orderId ?? '',
                optionIds
            );

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof OrderNotFoundForOptionsError) {
                res.status(404).json({ error: 'OrderNotFound', message: error.message });
                return;
            }
            if (error instanceof OrderAlreadyShippedError) {
                res.status(409).json({ error: 'OrderAlreadyShipped', message: error.message });
                return;
            }
            if (error instanceof OptionNotFoundError) {
                res.status(404).json({ error: 'OptionNotFound', message: error.message });
                return;
            }
            if (error instanceof OptionNotActiveError) {
                res.status(400).json({ error: 'OptionNotActive', message: error.message });
                return;
            }
            if (error instanceof OptionAlreadyAddedError) {
                res.status(409).json({ error: 'OptionAlreadyAdded', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/orders/:orderId/options
     * Récupère les options d'une commande
     */
    router.get('/:orderId/options', async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);

        if (!companyId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await optionService.getOrderOptions(req.params.orderId ?? '');
        res.json(result);
    });

    return router;
}
