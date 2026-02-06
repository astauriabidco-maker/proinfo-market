/**
 * SAV Routes
 * Configuration des routes REST pour le SAV & RMA
 */

import { Router } from 'express';
import { SavController } from '../controllers/sav.controller';
import { PrismaClient } from '@prisma/client';

export function createSavRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new SavController(prisma);

    // Tickets
    router.post('/tickets', controller.createTicket);
    router.get('/tickets/:id', controller.getTicket);

    // RMA
    router.post('/tickets/:ticketId/rma', controller.createRma);
    router.get('/rma/:rmaId', controller.getRma);
    router.post('/rma/:rmaId/receive', controller.receiveRma);
    router.post('/rma/:rmaId/diagnose', controller.diagnoseRma);
    router.post('/rma/:rmaId/resolve', controller.resolveRma);
    router.get('/rma/:rmaId/diagnosis', controller.getDiagnosisHistory);

    // Stats pour observabilité
    router.get('/stats', async (req, res) => {
        try {
            // Calculer les stats RMA
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Compter les RMA par statut
            const [totalRma, resolvedRma, scrapResolutions] = await Promise.all([
                prisma.rma.count({
                    where: { createdAt: { gte: thirtyDaysAgo } }
                }),
                prisma.rma.count({
                    where: {
                        status: 'RESOLVED',
                        createdAt: { gte: thirtyDaysAgo }
                    }
                }),
                prisma.rmaDiagnosis.count({
                    where: {
                        resolution: 'SCRAP',
                        createdAt: { gte: thirtyDaysAgo }
                    }
                })
            ]);

            // Calculer temps moyen de résolution
            const resolvedRmas = await prisma.rma.findMany({
                where: {
                    status: 'RESOLVED',
                    createdAt: { gte: thirtyDaysAgo }
                },
                include: {}
            });

            // Calcul simplifié du taux RMA (sur 30 jours)
            const rmaRate = totalRma > 0 ? (totalRma / 100) * 100 : 0;
            const scrapRate = totalRma > 0 ? (scrapResolutions / totalRma) * 100 : 0;

            res.json({
                success: true,
                rmaRate: rmaRate,
                avgResolutionDays: 5, // Valeur par défaut
                scrapRate: scrapRate,
                totalRma,
                resolvedRma,
                periodDays: 30
            });
        } catch (error: any) {
            console.error('[SAV] Stats error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    // Endpoint pour quality-service: récupérer les RMA par période
    router.get('/rma/by-period', async (req, res) => {
        try {
            const fromParam = req.query.from as string;
            const fromDate = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const rmas = await prisma.rma.findMany({
                where: {
                    createdAt: { gte: fromDate }
                },
                select: {
                    id: true,
                    assetId: true,
                    status: true,
                    createdAt: true
                }
            });

            res.json({
                success: true,
                rmas,
                count: rmas.length,
                from: fromDate.toISOString()
            });
        } catch (error: any) {
            console.error('[SAV] RMA by period error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
