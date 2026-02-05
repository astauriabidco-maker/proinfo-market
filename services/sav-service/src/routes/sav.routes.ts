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

    return router;
}
