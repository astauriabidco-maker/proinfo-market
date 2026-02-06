/**
 * RSE Routes
 * Endpoints REST pour le service RSE
 * 
 * RÈGLE : Lecture seule sur données externes, pas de modification
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { RseMethodologyService } from '../services/rseMethodology.service';
import { RseCalculationService } from '../services/rseCalculation.service';
import { RseReportService } from '../services/rseReport.service';
import { AssetClient } from '../integrations/asset.client';
import {
    CreateMethodologyDto,
    MethodologyVersionExistsError,
    NoActiveMethodologyError
} from '../domain/rseMethodology.types';
import { MetricsAlreadyExistError, AssetNotFoundError } from '../domain/rseMetric.types';
import { ExportFormat } from '../domain/rseReport.types';

const router = Router();
const prisma = new PrismaClient();
const assetClient = new AssetClient();
const methodologyService = new RseMethodologyService(prisma);
const calculationService = new RseCalculationService(prisma, methodologyService, assetClient);
const reportService = new RseReportService(prisma, calculationService, methodologyService, assetClient);

// ============================================
// METHODOLOGIES
// ============================================

/**
 * POST /rse/methodologies
 * Créer une nouvelle version de méthodologie
 */
router.post('/methodologies', async (req: Request, res: Response): Promise<void> => {
    try {
        const dto: CreateMethodologyDto = req.body;
        const methodology = await methodologyService.createMethodology(dto);
        res.status(201).json({ data: methodology });
    } catch (error) {
        if (error instanceof MethodologyVersionExistsError) {
            res.status(409).json({ error: error.message });
            return;
        }
        console.error('[RSE] Error creating methodology:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /rse/methodologies
 * Lister toutes les versions de méthodologies
 */
router.get('/methodologies', async (req: Request, res: Response): Promise<void> => {
    try {
        const methodologies = await methodologyService.getMethodologyHistory();
        res.json({ data: methodologies });
    } catch (error) {
        console.error('[RSE] Error fetching methodologies:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /rse/methodologies/active
 * Récupérer la méthodologie active
 */
router.get('/methodologies/active', async (req: Request, res: Response): Promise<void> => {
    try {
        const methodology = await methodologyService.getActiveMethodology();
        res.json({ data: methodology });
    } catch (error) {
        if (error instanceof NoActiveMethodologyError) {
            res.status(404).json({ error: error.message });
            return;
        }
        console.error('[RSE] Error fetching active methodology:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// ASSET METRICS
// ============================================

/**
 * POST /rse/assets/:assetId/calculate
 * Calculer les métriques RSE pour un asset
 * 
 * RÈGLE : Pas de recalcul si métriques existent
 */
router.post('/assets/:assetId/calculate', async (req: Request, res: Response): Promise<void> => {
    try {
        const { assetId } = req.params;
        const result = await calculationService.calculateForAsset(assetId);
        res.status(201).json({ data: result });
    } catch (error) {
        if (error instanceof MetricsAlreadyExistError) {
            res.status(409).json({
                error: error.message,
                code: 'METRICS_ALREADY_EXIST'
            });
            return;
        }
        if (error instanceof AssetNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error instanceof NoActiveMethodologyError) {
            res.status(400).json({ error: error.message });
            return;
        }
        console.error('[RSE] Error calculating metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /rse/assets/:assetId/metrics
 * Récupérer les métriques d'un asset
 */
router.get('/assets/:assetId/metrics', async (req: Request, res: Response): Promise<void> => {
    try {
        const { assetId } = req.params;
        const metrics = await calculationService.getMetricsForAsset(assetId);
        res.json({ data: metrics });
    } catch (error) {
        console.error('[RSE] Error fetching metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// REPORTS
// ============================================

/**
 * GET /rse/reports
 * Générer un rapport client
 */
router.get('/reports', async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef, period } = req.query;

        if (!customerRef || typeof customerRef !== 'string') {
            res.status(400).json({ error: 'customerRef is required' });
            return;
        }

        const report = await reportService.getCustomerReport({
            customerRef,
            period: typeof period === 'string' ? period : undefined
        });

        res.json({ data: report });
    } catch (error) {
        console.error('[RSE] Error generating report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /rse/reports/export
 * Exporter un rapport (PDF, CSV, JSON)
 */
router.get('/reports/export', async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef, period, format } = req.query;

        if (!customerRef || typeof customerRef !== 'string') {
            res.status(400).json({ error: 'customerRef is required' });
            return;
        }

        const exportFormat: ExportFormat = (format as ExportFormat) || 'JSON';

        const report = await reportService.getCustomerReport({
            customerRef,
            period: typeof period === 'string' ? period : undefined
        });

        const result = await reportService.exportReport(report, {
            format: exportFormat
        });

        res.setHeader('Content-Type', result.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
    } catch (error) {
        console.error('[RSE] Error exporting report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
