/**
 * Reporting Routes
 * Configuration des routes REST pour le reporting RSE
 */

import { Router } from 'express';
import { ReportingController } from '../controllers/reporting.controller';
import { PrismaClient } from '@prisma/client';

export function createReportingRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new ReportingController(prisma);

    // Calcul RSE
    router.post('/assets/:assetId/calculate', controller.calculateRseSnapshot);

    // Lecture RSE Asset
    router.get('/assets/:assetId', controller.getRseSnapshot);

    // Rapport client
    router.get('/customers/:customerRef', controller.getCustomerReport);

    // Méthodologie (transparence)
    router.get('/methodology', controller.getMethodology);

    return router;
}
