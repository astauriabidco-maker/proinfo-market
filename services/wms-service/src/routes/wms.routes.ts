/**
 * WMS Routes
 * Configuration des routes REST pour le WMS
 */

import { Router } from 'express';
import { WmsController } from '../controllers/wms.controller';
import { PrismaClient } from '@prisma/client';

export function createWmsRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new WmsController(prisma);

    // === Picking ===
    router.post('/picking', controller.createPickingOrder);
    router.get('/picking/:id', controller.getPickingOrder);
    router.post('/picking/:id/start', controller.startPicking);
    router.post('/picking/:id/complete', controller.completePicking);

    // === Assembly ===
    router.post('/assembly', controller.createAssemblyOrder);
    router.get('/assembly/:id', controller.getAssemblyOrder);
    router.post('/assembly/:id/start', controller.startAssembly);
    router.post('/assembly/:id/complete', controller.completeAssembly);

    // === Shipments ===
    router.post('/shipments', controller.createShipment);
    router.get('/shipments/:id', controller.getShipment);

    // === Returns ===
    router.post('/returns', controller.createReturn);
    router.get('/returns/:id', controller.getReturn);

    return router;
}
