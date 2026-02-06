/**
 * Delegations Routes
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DelegationService } from '../services/delegation.service';

const router = Router();
const prisma = new PrismaClient();
const delegationService = new DelegationService(prisma);

/**
 * POST /delegations
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const delegation = await delegationService.createDelegation(req.body);
        res.status(201).json({ data: delegation });
    } catch (error: any) {
        if (error.name === 'CannotDelegateError') {
            res.status(403).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to create delegation' });
    }
});

/**
 * GET /delegations/to/:userId
 */
router.get('/to/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const delegations = await delegationService.getActiveDelegationsTo(req.params.userId);
        res.json({ data: delegations });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delegations' });
    }
});

/**
 * GET /delegations/from/:userId
 */
router.get('/from/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const delegations = await delegationService.getDelegationsFrom(req.params.userId);
        res.json({ data: delegations });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delegations' });
    }
});

/**
 * POST /delegations/:id/revoke
 */
router.post('/:id/revoke', async (req: Request, res: Response): Promise<void> => {
    try {
        const { revokedBy } = req.body;
        await delegationService.revokeDelegation(req.params.id, revokedBy);
        res.json({ data: { revoked: true } });
    } catch (error: any) {
        if (error.name === 'DelegationNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to revoke delegation' });
    }
});

/**
 * POST /delegations/expire
 * Cron endpoint to expire delegations
 */
router.post('/expire', async (req: Request, res: Response): Promise<void> => {
    try {
        const count = await delegationService.expireExpiredDelegations();
        res.json({ data: { expired: count } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to expire delegations' });
    }
});

export default router;
