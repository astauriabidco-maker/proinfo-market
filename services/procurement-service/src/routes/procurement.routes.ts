/**
 * Procurement Routes
 * Configuration des routes REST pour les achats
 */

import { Router } from 'express';
import { ProcurementController } from '../controllers/procurement.controller';
import { PrismaClient } from '@prisma/client';

export function createProcurementRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new ProcurementController(prisma);

    // POST /procurement/lots - Créer un lot d'achat
    router.post('/lots', controller.createLot);

    // GET /procurement/lots - Lister tous les lots
    router.get('/lots', controller.listLots);

    // GET /procurement/lots/:lotId - Récupérer un lot
    router.get('/lots/:lotId', controller.getLot);

    // GET /procurement/lots/:lotId/items - Récupérer les items d'un lot
    router.get('/lots/:lotId/items', controller.getLotItems);

    // POST /procurement/lots/:lotId/intake - Intake d'une machine
    router.post('/lots/:lotId/intake', controller.intakeAsset);

    return router;
}
