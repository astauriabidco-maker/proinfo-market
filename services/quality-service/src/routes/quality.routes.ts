/**
 * Quality Routes
 * Configuration des routes REST pour la qualité
 */

import { Router } from 'express';
import { QualityController } from '../controllers/quality.controller';
import { PrismaClient } from '@prisma/client';

export function createQualityRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new QualityController(prisma);

    // === Checklists ===
    router.post('/checklists', controller.createChecklist);
    router.get('/checklists', controller.listChecklists);
    router.get('/checklists/:id', controller.getChecklist);

    // === Asset Quality Results ===
    router.post('/assets/:assetId/results', controller.recordQualityResult);
    router.get('/assets/:assetId/results', controller.getQualityResults);

    // === Battery Health ===
    router.post('/assets/:assetId/battery', controller.recordBatteryHealth);
    router.get('/assets/:assetId/battery', controller.getBatteryHealth);

    // === Validation ===
    router.post('/assets/:assetId/validate', controller.validateQuality);

    return router;
}
