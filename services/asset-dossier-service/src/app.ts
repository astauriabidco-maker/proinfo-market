/**
 * Asset Dossier Service — Express App
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createAssetDossierRoutes } from './routes/assetDossier.routes';

const prisma = new PrismaClient();

export function createApp(): express.Application {
    const app = express();

    app.use(express.json());

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', service: 'asset-dossier-service' });
    });

    // Asset Dossier routes
    app.use('/asset-dossiers', createAssetDossierRoutes(prisma));

    return app;
}
