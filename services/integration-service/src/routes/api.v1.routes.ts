/**
 * API v1 Routes
 * Endpoints publics versionnés
 * 
 * RÈGLE : Clients s'adaptent à l'API, pas l'inverse
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiGatewayService } from '../services/apiGateway.service';
import { ClientSyncService } from '../services/clientSync.service';
import { createAuthMiddleware, requireScope } from '../middleware/auth.middleware';
import { API_VERSION, TenantIsolationError } from '../domain/apiContract.types';

const router = Router();
const prisma = new PrismaClient();
const gateway = new ApiGatewayService(prisma);
const syncService = new ClientSyncService(prisma);

// Auth middleware on all routes
router.use(createAuthMiddleware(gateway));

// ============================================
// ASSETS (read:assets)
// ============================================

/**
 * GET /api/v1/assets
 * Liste des assets du client
 */
router.get('/assets',
    requireScope(gateway, 'read:assets'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const assets = await syncService.getAssets(req.apiClient!.companyId);
            await logRequest(req, 200);
            res.json({
                data: assets,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch assets' } });
        }
    }
);

/**
 * GET /api/v1/assets/:assetId
 * Détail d'un asset
 */
router.get('/assets/:assetId',
    requireScope(gateway, 'read:assets'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const asset = await syncService.getAsset(req.apiClient!.companyId, req.params.assetId);
            if (!asset) {
                await logRequest(req, 404);
                res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Asset not found' } });
                return;
            }
            await logRequest(req, 200);
            res.json({
                data: asset,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            if (error instanceof TenantIsolationError) {
                await logRequest(req, 403);
                res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cross-tenant access denied' } });
                return;
            }
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch asset' } });
        }
    }
);

/**
 * GET /api/v1/assets/:assetId/dossier
 * Dossier machine (Sprint 23)
 */
router.get('/assets/:assetId/dossier',
    requireScope(gateway, 'read:assets'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const dossier = await syncService.getAssetDossier(req.apiClient!.companyId, req.params.assetId);
            if (!dossier) {
                await logRequest(req, 404);
                res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dossier not found' } });
                return;
            }
            await logRequest(req, 200);
            res.json({
                data: dossier,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch dossier' } });
        }
    }
);

// ============================================
// RSE (read:rse)
// ============================================

/**
 * GET /api/v1/rse/reports
 * Rapport RSE (Sprint 24)
 */
router.get('/rse/reports',
    requireScope(gateway, 'read:rse'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { period } = req.query;
            const report = await syncService.getRseReport(
                req.apiClient!.companyId,
                typeof period === 'string' ? period : undefined
            );
            await logRequest(req, 200);
            res.json({
                data: report,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch RSE report' } });
        }
    }
);

// ============================================
// SAV (read:sav + write:sav)
// ============================================

/**
 * GET /api/v1/sav/tickets
 * Liste des tickets SAV
 */
router.get('/sav/tickets',
    requireScope(gateway, 'read:sav'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const tickets = await syncService.getTickets(req.apiClient!.companyId);
            await logRequest(req, 200);
            res.json({
                data: tickets,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tickets' } });
        }
    }
);

/**
 * POST /api/v1/sav/tickets
 * Créer un ticket SAV (ÉCRITURE AUTORISÉE)
 */
router.post('/sav/tickets',
    requireScope(gateway, 'write:sav'),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId, issue, priority, externalRef } = req.body;

            if (!assetId || !issue) {
                await logRequest(req, 400);
                res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'assetId and issue required' } });
                return;
            }

            const result = await syncService.createTicket(req.apiClient!.companyId, {
                assetId,
                issue,
                priority,
                externalRef
            });

            await logRequest(req, 201);
            res.status(201).json({
                data: result,
                meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
            });
        } catch (error) {
            await logRequest(req, 500);
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create ticket' } });
        }
    }
);

// ============================================
// HELPERS
// ============================================

async function logRequest(req: Request, statusCode: number): Promise<void> {
    if (req.apiClient) {
        try {
            await gateway.logAccess(
                req.apiClient.id,
                req.apiClient.companyId,
                req.path,
                req.method,
                statusCode
            );
        } catch {
            // Ignore logging errors
        }
    }
}

export default router;
