/**
 * Express Application
 * Configuration de l'application Express
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createInventoryRoutes } from './routes/inventory.routes';
import { createRoutingRouter } from './routes/routing.routes';

export function createApp(prisma: PrismaClient): Application {
    const app = express();

    // Middleware
    app.use(express.json());

    // Health check
    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', service: 'inventory-service' });
    });

    // Routes
    app.use('/inventory', createInventoryRoutes(prisma));
    app.use('/inventory', createRoutingRouter(prisma));

    // 404 handler
    app.use((_req: Request, res: Response) => {
        res.status(404).json({ error: 'NotFound', message: 'Route not found' });
    });

    // Error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error('[UNHANDLED_ERROR]', err);
        res.status(500).json({
            error: 'InternalServerError',
            message: 'An unexpected error occurred'
        });
    });

    return app;
}
