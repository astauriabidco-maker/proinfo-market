/**
 * Webhook Routes
 * Gestion des abonnements webhook
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiGatewayService } from '../services/apiGateway.service';
import { WebhookDispatcherService } from '../services/webhookDispatcher.service';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { WebhookEvent, EVENT_DESCRIPTIONS } from '../domain/webhook.types';
import { API_VERSION } from '../domain/apiContract.types';

const router = Router();
const prisma = new PrismaClient();
const gateway = new ApiGatewayService(prisma);
const webhookService = new WebhookDispatcherService(prisma);

// Auth middleware
router.use(createAuthMiddleware(gateway));

/**
 * GET /webhooks/events
 * Liste des événements disponibles
 */
router.get('/events', (req: Request, res: Response): void => {
    res.json({
        data: EVENT_DESCRIPTIONS,
        meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
    });
});

/**
 * GET /webhooks/subscriptions
 * Liste des abonnements du client
 */
router.get('/subscriptions', async (req: Request, res: Response): Promise<void> => {
    try {
        const subscriptions = await prisma.webhookSubscription.findMany({
            where: { companyId: req.apiClient!.companyId },
            select: {
                id: true,
                event: true,
                targetUrl: true,
                active: true,
                failCount: true,
                createdAt: true
            }
        });

        res.json({
            data: subscriptions,
            meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
        });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch subscriptions' } });
    }
});

/**
 * POST /webhooks/subscriptions
 * Créer un abonnement webhook
 */
router.post('/subscriptions', async (req: Request, res: Response): Promise<void> => {
    try {
        const { event, targetUrl } = req.body;

        if (!event || !targetUrl) {
            res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'event and targetUrl required' } });
            return;
        }

        // Valider l'événement
        const validEvents: WebhookEvent[] = ['ASSET_SHIPPED', 'RMA_CREATED', 'RMA_RESOLVED', 'INVOICE_ISSUED'];
        if (!validEvents.includes(event)) {
            res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid event. Valid: ${validEvents.join(', ')}` } });
            return;
        }

        const result = await webhookService.subscribe(req.apiClient!.companyId, event, targetUrl);

        res.status(201).json({
            data: {
                id: result.id,
                event,
                targetUrl,
                secret: result.secret,  // ⚠️ Retourné une seule fois
                message: 'Store this secret securely. It will not be shown again.'
            },
            meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
        });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' } });
    }
});

/**
 * DELETE /webhooks/subscriptions/:id
 * Supprimer un abonnement
 */
router.delete('/subscriptions/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const subscription = await prisma.webhookSubscription.findUnique({
            where: { id: req.params.id }
        });

        if (!subscription) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Subscription not found' } });
            return;
        }

        // Vérifier appartenance
        if (subscription.companyId !== req.apiClient!.companyId) {
            res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cross-tenant access denied' } });
            return;
        }

        await prisma.webhookSubscription.delete({ where: { id: req.params.id } });

        res.json({
            data: { deleted: true },
            meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
        });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete subscription' } });
    }
});

export default router;
