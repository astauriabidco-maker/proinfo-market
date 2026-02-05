/**
 * Express Application
 * Configuration de l'application Express
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createOrderRoutes } from './routes/order.routes';
import { createAuthRoutes } from './routes/auth.routes';
import { createCompanyRoutes } from './routes/company.routes';
import { createQuoteRoutes } from './routes/quote.routes';
import { createPremiumOptionsRoutes } from './routes/premium-options.routes';
// Sprint 12 - Routes V2 avec Prisma
import { createCompanyRoutesV2, createMeRoute } from './routes/company-b2b.routes';
import prisma from './lib/prisma';

export function createApp(): Application {
    const app = express();

    // Middleware
    app.use(express.json());

    // CORS pour le frontend
    app.use((_req: Request, res: Response, next: NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });

    // Health check
    app.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({ status: 'ok', service: 'ecommerce-backend' });
    });

    // Routes V1 (Phase 1 - in-memory)
    app.use('/auth', createAuthRoutes());
    app.use('/companies', createCompanyRoutes());
    app.use('/quotes', createQuoteRoutes());
    app.use('/premium-options', createPremiumOptionsRoutes());
    app.use('/orders', createOrderRoutes());

    // Routes V2 (Sprint 12 - Prisma/PostgreSQL)
    app.use('/v2/companies', createCompanyRoutesV2(prisma));
    app.use('/v2/me', createMeRoute(prisma));

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
