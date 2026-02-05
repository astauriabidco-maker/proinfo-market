/**
 * CTO Routes
 * Configuration des routes REST pour le CTO Engine
 */

import { Router } from 'express';
import { CtoController } from '../controllers/cto.controller';
import { PrismaClient } from '@prisma/client';

export function createCtoRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new CtoController(prisma);

    // Validation complète
    router.post('/validate', controller.validateConfiguration);

    // Récupération configuration
    router.get('/configurations/:id', controller.getConfiguration);

    // Récupération prix (FIGÉ)
    router.get('/configurations/:id/price', controller.getPrice);

    return router;
}
