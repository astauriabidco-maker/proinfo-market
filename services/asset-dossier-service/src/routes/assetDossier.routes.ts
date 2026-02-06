/**
 * Asset Dossier Routes
 * API REST pour le dossier machine
 * 
 * ENDPOINTS :
 * - POST /asset-dossiers/:assetId/build — Construire snapshot
 * - GET /asset-dossiers/:assetId — Vue JSON structurée
 * - GET /asset-dossiers/:assetId/export — PDF/ZIP audit-ready
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AssetDossierBuilderService } from '../services/assetDossierBuilder.service';
import { AssetDossierExportService } from '../services/assetDossierExport.service';
import { AssetNotFoundError, DossierNotFoundError } from '../domain/assetDossier.types';
import { ExportFormat } from '../domain/export.types';

export function createAssetDossierRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const builderService = new AssetDossierBuilderService(prisma);
    const exportService = new AssetDossierExportService();

    /**
     * POST /asset-dossiers/:assetId/build
     * Construire et persister un snapshot du dossier machine
     * 
     * RÈGLE : Crée un nouveau snapshot, jamais de modification
     */
    router.post('/:assetId/build', async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId } = req.params;

            console.log(`[DOSSIER] Build request for asset: ${assetId}`);

            const dossier = await builderService.buildDossier(assetId);

            res.status(201).json({
                success: true,
                data: dossier,
                message: `Dossier built successfully: ${dossier.meta.snapshotId}`
            });
        } catch (error: any) {
            if (error instanceof AssetNotFoundError) {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            console.error('[DOSSIER] Build error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /asset-dossiers/:assetId
     * Récupérer la vue structurée du dernier dossier
     */
    router.get('/:assetId', async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId } = req.params;

            const dossier = await builderService.getLatestDossier(assetId);

            if (!dossier) {
                res.status(404).json({
                    success: false,
                    error: `No dossier found for asset ${assetId}. Build one first with POST /asset-dossiers/${assetId}/build`
                });
                return;
            }

            res.json({
                success: true,
                data: dossier
            });
        } catch (error: any) {
            console.error('[DOSSIER] Get error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /asset-dossiers/:assetId/export
     * Exporter le dossier en PDF/JSON/ZIP
     * 
     * Query params:
     * - format: PDF | JSON | ZIP (default: ZIP)
     */
    router.get('/:assetId/export', async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId } = req.params;
            const format = (req.query.format as ExportFormat) || 'ZIP';

            const dossier = await builderService.getLatestDossier(assetId);

            if (!dossier) {
                res.status(404).json({
                    success: false,
                    error: `No dossier found for asset ${assetId}. Build one first.`
                });
                return;
            }

            const result = await exportService.export(dossier, { format });

            res.setHeader('Content-Type', result.mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            res.send(result.buffer);
        } catch (error: any) {
            console.error('[DOSSIER] Export error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /asset-dossiers/:assetId/history
     * Historique de tous les snapshots d'un asset
     */
    router.get('/:assetId/history', async (req: Request, res: Response): Promise<void> => {
        try {
            const { assetId } = req.params;

            const snapshots = await prisma.assetDossierSnapshot.findMany({
                where: { assetId },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    assetId: true,
                    createdAt: true
                }
            });

            res.json({
                success: true,
                data: snapshots,
                count: snapshots.length
            });
        } catch (error: any) {
            console.error('[DOSSIER] History error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
