/**
 * Renewal Routes
 * Endpoints pour renouvellements et reprises
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { RenewalPlannerService } from '../services/renewalPlanner.service';
import { AssetTakebackService } from '../services/assetTakeback.service';

const router = Router();
const prisma = new PrismaClient();
const renewalService = new RenewalPlannerService(prisma);
const takebackService = new AssetTakebackService(prisma);

// ============================================
// RENEWALS
// ============================================

/**
 * GET /renewals
 * Renouvellements à venir
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const daysAhead = parseInt(req.query.daysAhead as string) || 90;
        const renewals = await renewalService.getUpcomingRenewals(daysAhead);
        res.json({ data: renewals });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch renewals' });
    }
});

/**
 * GET /renewals/:id
 * Détail d'un renouvellement
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const renewal = await renewalService.getRenewalPlan(req.params.id);
        res.json({ data: renewal });
    } catch (error: any) {
        if (error.name === 'RenewalNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to fetch renewal' });
    }
});

/**
 * GET /renewals/notifications/pending
 * Notifications en attente
 */
router.get('/notifications/pending', async (req: Request, res: Response): Promise<void> => {
    try {
        const pending = await renewalService.checkPendingNotifications();
        res.json({ data: pending });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check notifications' });
    }
});

/**
 * POST /renewals/:id/execute
 * Exécuter un renouvellement (EXPLICITE)
 */
router.post('/:id/execute', async (req: Request, res: Response): Promise<void> => {
    try {
        const { executedBy, notes } = req.body;

        if (!executedBy) {
            res.status(400).json({ error: 'executedBy required - no automatic renewal allowed' });
            return;
        }

        await renewalService.executeRenewal(req.params.id, { executedBy, notes });

        // Déclencher les reprises
        const takebacks = await takebackService.createTakebacksForRenewal(req.params.id);

        res.json({
            data: {
                executed: true,
                takebacksCreated: takebacks.length
            }
        });
    } catch (error: any) {
        if (error.name === 'RenewalNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.name === 'RenewalAlreadyExecutedError') {
            res.status(409).json({ error: error.message });
            return;
        }
        if (error.name === 'AutoRenewalNotAllowedError') {
            res.status(403).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to execute renewal' });
    }
});

/**
 * POST /renewals/:id/cancel
 * Annuler un renouvellement
 */
router.post('/:id/cancel', async (req: Request, res: Response): Promise<void> => {
    try {
        await renewalService.cancelRenewal(req.params.id);
        res.json({ data: { cancelled: true } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to cancel renewal' });
    }
});

// ============================================
// TAKEBACKS
// ============================================

/**
 * GET /renewals/:id/takebacks
 * Reprises d'un renouvellement
 */
router.get('/:id/takebacks', async (req: Request, res: Response): Promise<void> => {
    try {
        const takebacks = await takebackService.getTakebacksByRenewal(req.params.id);
        res.json({ data: takebacks });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch takebacks' });
    }
});

/**
 * PATCH /renewals/takebacks/:takebackId
 * Mettre à jour une reprise
 */
router.patch('/takebacks/:takebackId', async (req: Request, res: Response): Promise<void> => {
    try {
        const takeback = await takebackService.updateTakebackStatus(req.params.takebackId, req.body);
        res.json({ data: takeback });
    } catch (error: any) {
        if (error.name === 'TakebackNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.name === 'TakebackInvalidTransitionError') {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to update takeback' });
    }
});

/**
 * POST /renewals/takebacks/:takebackId/confirm-wipe
 * Confirmer l'effacement des données
 */
router.post('/takebacks/:takebackId/confirm-wipe', async (req: Request, res: Response): Promise<void> => {
    try {
        await takebackService.confirmDataWipe(req.params.takebackId);
        res.json({ data: { dataWipeConfirmed: true } });
    } catch (error: any) {
        if (error.name === 'TakebackNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to confirm data wipe' });
    }
});

export default router;
