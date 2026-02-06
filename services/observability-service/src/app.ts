/**
 * Express Application
 * Configuration de l'application Express pour observability-service
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createKpiRouter } from './routes/kpi.routes';

export function createApp(prisma: PrismaClient): Application {
    const app = express();

    // Middleware
    app.use(express.json());

    // Health check
    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', service: 'observability-service' });
    });

    // Routes
    app.use('/kpi', createKpiRouter(prisma));

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
