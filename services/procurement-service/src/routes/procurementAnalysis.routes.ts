/**
 * Procurement Analysis Routes
 * API REST pour simulation de marge et décisions d'approvisionnement
 * 
 * RÈGLE : Le système éclaire la décision, l'humain tranche.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, ProcurementDecision } from '@prisma/client';
import {
    ProcurementAnalysisService,
    SalesDataProvider,
    QualityDataProvider
} from '../services/procurementAnalysis.service';
import { SimulationRequest } from '../domain/procurementDecision.types';

// ============================================
// MOCK PROVIDERS (à remplacer par vraies intégrations)
// ============================================

class MockSalesDataProvider implements SalesDataProvider {
    async getAverageSellPrice(model: string): Promise<number | null> {
        // Mock data - en production, requêter le sales/ecommerce service
        const mockPrices: Record<string, number> = {
            'Dell PowerEdge R740': 2500,
            'HP ProLiant DL380': 2200,
            'Dell XPS 15': 1500,
            'HP ProBook 450': 800
        };
        return mockPrices[model] ?? null;
    }
}

class MockQualityDataProvider implements QualityDataProvider {
    async getRmaRate(model: string): Promise<number | null> {
        // Mock - en production, requêter le quality service
        const mockRates: Record<string, number> = {
            'Dell PowerEdge R740': 2,
            'HP ProLiant DL380': 3,
            'Dell XPS 15': 4,
            'HP ProBook 450': 8  // High RMA rate
        };
        return mockRates[model] ?? null;
    }

    async hasActiveAlert(model: string): Promise<boolean> {
        // Mock - en production, requêter quality/analytics/alerts
        const alertedModels = ['HP ProBook 450', 'Toxic Model'];
        return alertedModels.includes(model);
    }
}

// ============================================
// ROUTES
// ============================================

export function createProcurementAnalysisRouter(prisma: PrismaClient): Router {
    const router = Router();

    const salesProvider = new MockSalesDataProvider();
    const qualityProvider = new MockQualityDataProvider();
    const analysisService = new ProcurementAnalysisService(prisma, salesProvider, qualityProvider);

    /**
     * POST /procurement/simulate
     * Simule la rentabilité d'un lot avant achat
     */
    router.post('/simulate', async (req: Request, res: Response): Promise<void> => {
        try {
            const request: SimulationRequest = {
                supplier: req.body.supplier,
                model: req.body.model,
                quantity: Number(req.body.quantity),
                unitCost: Number(req.body.unitCost)
            };

            const result = await analysisService.simulateLot(request);

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('[ProcurementAnalysis] Error simulating lot:', error);
            res.status(error.name === 'InvalidSimulationRequestError' ? 400 : 500).json({
                success: false,
                error: error.message || 'Failed to simulate lot'
            });
        }
    });

    /**
     * POST /procurement/lots
     * Enregistre une décision d'achat
     */
    router.post('/lots', async (req: Request, res: Response): Promise<void> => {
        try {
            const dto = {
                supplier: req.body.supplier,
                supplierType: req.body.supplierType || 'ENTERPRISE',
                model: req.body.model,
                quantity: Number(req.body.quantity),
                unitCost: Number(req.body.unitCost),
                totalPurchasePrice: Number(req.body.totalPurchasePrice) || Number(req.body.unitCost) * Number(req.body.quantity),
                estimatedValue: Number(req.body.estimatedValue),
                estimatedMargin: Number(req.body.estimatedMargin),
                decision: req.body.decision as ProcurementDecision,
                comment: req.body.comment
            };

            const result = await analysisService.recordDecision(dto);

            res.status(201).json({
                success: true,
                message: 'Decision recorded',
                data: result
            });
        } catch (error: any) {
            console.error('[ProcurementAnalysis] Error recording decision:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to record decision'
            });
        }
    });

    /**
     * GET /procurement/lots
     * Consultation historique achats avec filtres
     */
    router.get('/lots', async (req: Request, res: Response): Promise<void> => {
        try {
            const filter = {
                supplier: req.query.supplier as string | undefined,
                model: req.query.model as string | undefined,
                decision: req.query.decision as ProcurementDecision | undefined
            };

            const lots = await analysisService.getLotHistory(filter);

            res.json({
                success: true,
                data: lots,
                count: lots.length
            });
        } catch (error: any) {
            console.error('[ProcurementAnalysis] Error getting lot history:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get lot history'
            });
        }
    });

    return router;
}
