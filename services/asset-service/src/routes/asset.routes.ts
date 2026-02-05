/**
 * Asset Routes
 * Configuration des routes REST pour les Assets
 */

import { Router } from 'express';
import { AssetController } from '../controllers/asset.controller';
import { PrismaClient } from '@prisma/client';

export function createAssetRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new AssetController(prisma);

    // POST /assets - Créer un asset
    router.post('/', controller.createAsset);

    // GET /assets - Lister tous les assets
    router.get('/', controller.listAssets);

    // GET /assets/:id - Récupérer un asset
    router.get('/:id', controller.getAsset);

    // GET /assets/:id/history - Récupérer l'historique
    router.get('/:id/history', controller.getAssetHistory);

    // POST /assets/:id/status - Changer le statut
    router.post('/:id/status', controller.changeStatus);

    return router;
}
