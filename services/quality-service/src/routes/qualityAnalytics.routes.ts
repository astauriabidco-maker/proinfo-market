/**
 * Quality Analytics Routes
 * API REST pour le pilotage qualité avancé
 * 
 * RÈGLE : Lecture analytique uniquement - pas de modification d'Assets
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    QualityAnalyticsService,
    RmaDataProvider,
    AssetDataProvider
} from '../analytics/qualityAnalytics.service';

// ============================================
// MOCK PROVIDERS (à remplacer par vraies intégrations)
// ============================================

/**
 * Provider mock pour les données RMA
 * En prod : appeler le SAV service via HTTP
 */
class MockRmaDataProvider implements RmaDataProvider {
    async getRmaCountByModel(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>> {
        // Mock data - en production, requêter le SAV service
        return new Map();
    }

    async getRmaCountBySupplier(fromDate: Date): Promise<Map<string, { total: number; rmaCount: number }>> {
        return new Map();
    }
}

/**
 * Provider mock pour les données Asset
 * En prod : appeler le Asset service via HTTP
 */
class MockAssetDataProvider implements AssetDataProvider {
    async getAssetModel(assetId: string): Promise<string | null> {
        // Mock - en production, requêter l'asset service
        return null;
    }

    async getAssetSupplier(assetId: string): Promise<string | null> {
        return null;
    }
}

// ============================================
// ROUTES
// ============================================

export function createQualityAnalyticsRouter(prisma: PrismaClient): Router {
    const router = Router();

    // Initialiser avec providers (mock pour MVP, HTTP en prod)
    const rmaProvider = new MockRmaDataProvider();
    const assetProvider = new MockAssetDataProvider();
    const analyticsService = new QualityAnalyticsService(prisma, rmaProvider, assetProvider);

    /**
     * GET /quality/analytics/summary
     * Retourne les alertes actives, métriques clés et tendances
     */
    router.get('/summary', async (req: Request, res: Response) => {
        try {
            const summary = await analyticsService.getSummary();
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            console.error('[QualityAnalytics] Error getting summary:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get quality summary'
            });
        }
    });

    /**
     * POST /quality/analytics/calculate
     * Déclenche le calcul des métriques et la détection d'alertes
     * MANUEL UNIQUEMENT (pas de cron automatique v1)
     */
    router.post('/calculate', async (req: Request, res: Response) => {
        try {
            const newAlerts = await analyticsService.detectAlerts();
            res.json({
                success: true,
                message: 'Metrics calculated and alerts detected',
                newAlertsCount: newAlerts.length,
                newAlerts
            });
        } catch (error) {
            console.error('[QualityAnalytics] Error calculating metrics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate metrics'
            });
        }
    });

    /**
     * GET /quality/analytics/blocked/:assetId
     * Vérifie si un asset est bloqué par une alerte active
     */
    router.get('/blocked/:assetId', async (req: Request, res: Response): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({
                    success: false,
                    error: 'assetId is required'
                });
                return;
            }
            const result = await analyticsService.isAssetBlocked(assetId);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('[QualityAnalytics] Error checking blocked status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check blocked status'
            });
        }
    });

    /**
     * GET /quality/analytics/alerts
     * Retourne toutes les alertes actives
     */
    router.get('/alerts', async (req: Request, res: Response) => {
        try {
            const alerts = await analyticsService.getActiveAlerts();
            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            console.error('[QualityAnalytics] Error getting alerts:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get alerts'
            });
        }
    });

    /**
     * POST /quality/analytics/alerts/:alertId/clear
     * Désactive une alerte manuellement
     * IMPORTANT : Seule action humaine autorisée sur les alertes
     */
    router.post('/alerts/:alertId/clear', async (req: Request, res: Response): Promise<void> => {
        try {
            const alertId = req.params.alertId;
            if (!alertId) {
                res.status(400).json({
                    success: false,
                    error: 'alertId is required'
                });
                return;
            }
            const alert = await analyticsService.clearAlert(alertId);
            res.json({
                success: true,
                message: 'Alert cleared',
                data: alert
            });
        } catch (error) {
            console.error('[QualityAnalytics] Error clearing alert:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clear alert'
            });
        }
    });

    return router;
}
