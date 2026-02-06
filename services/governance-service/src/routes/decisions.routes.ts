/**
 * Decisions Routes
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DecisionLogService } from '../services/decisionLog.service';

const router = Router();
const prisma = new PrismaClient();
const decisionLogService = new DecisionLogService(prisma);

/**
 * GET /decisions
 * Audit interne
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { period, actorId, action, limit } = req.query;
        const decisions = await decisionLogService.getDecisions({
            period: period as any,
            actorId: actorId as string,
            action: action as string,
            limit: limit ? parseInt(limit as string) : undefined
        });
        res.json({ data: decisions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch decisions' });
    }
});

/**
 * GET /decisions/stats
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    try {
        const period = (req.query.period as string) || 'LAST_30_DAYS';
        const stats = await decisionLogService.getDecisionStats(period as any);
        res.json({ data: stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /decisions/actor/:actorId
 */
router.get('/actor/:actorId', async (req: Request, res: Response): Promise<void> => {
    try {
        const decisions = await decisionLogService.getDecisionsByActor(req.params.actorId);
        res.json({ data: decisions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch decisions' });
    }
});

export default router;
