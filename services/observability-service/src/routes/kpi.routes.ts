/**
 * KPI Routes
 * API REST pour les KPIs opérationnels
 * 
 * RÈGLE : Lecture seule, snapshots figés
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, KpiPeriod } from '@prisma/client';
import { KpiCalculationService, RealServiceDataProvider } from '../services/kpiCalculation.service';

export function createKpiRouter(prisma: PrismaClient): Router {
    const router = Router();
    // Utiliser le provider réel pour des données de production
    const dataProvider = new RealServiceDataProvider();
    const kpiService = new KpiCalculationService(prisma, dataProvider);

    /**
     * GET /kpi
     * Liste des KPIs par période
     */
    router.get('/', async (req: Request, res: Response): Promise<void> => {
        try {
            const period = req.query.period as KpiPeriod | undefined;
            const kpis = await kpiService.getLatestKpis(period);

            res.json({
                success: true,
                data: kpis,
                count: kpis.length,
                period: period || 'ALL'
            });
        } catch (error: any) {
            console.error('[KPI] Error getting KPIs:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get KPIs'
            });
        }
    });

    /**
     * POST /kpi/calculate
     * Déclenche le calcul manuel des KPIs
     */
    router.post('/calculate', async (req: Request, res: Response): Promise<void> => {
        try {
            const period = (req.body.period as KpiPeriod) || KpiPeriod.DAILY;
            const result = await kpiService.calculateAllKpis(period);

            res.json({
                success: true,
                message: 'KPIs calculated and saved',
                data: {
                    period: result.period,
                    calculatedAt: result.calculatedAt,
                    kpiCount: result.kpis.length,
                    flagsRaised: result.flags.length,
                    flags: result.flags
                }
            });
        } catch (error: any) {
            console.error('[KPI] Error calculating KPIs:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to calculate KPIs'
            });
        }
    });

    /**
     * GET /kpi/summary
     * Résumé des KPIs avec statut couleur
     */
    router.get('/summary', async (req: Request, res: Response): Promise<void> => {
        try {
            const kpis = await kpiService.getLatestKpis(KpiPeriod.DAILY);

            // Regrouper par flag
            const summary = {
                ok: kpis.filter(k => k.flag === 'OK').length,
                warning: kpis.filter(k => k.flag === 'WARNING').length,
                critical: kpis.filter(k => k.flag === 'CRITICAL').length,
                kpis: kpis.map(k => ({
                    key: k.key,
                    value: k.value,
                    flag: k.flag,
                    color: k.flag === 'OK' ? 'green' : k.flag === 'WARNING' ? 'orange' : 'red'
                }))
            };

            res.json({
                success: true,
                data: summary
            });
        } catch (error: any) {
            console.error('[KPI] Error getting summary:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get summary'
            });
        }
    });

    /**
     * GET /kpi/:key/history
     * Historique d'un KPI spécifique
     */
    router.get('/:key/history', async (req: Request, res: Response): Promise<void> => {
        try {
            const key = req.params.key;
            if (!key) {
                res.status(400).json({
                    success: false,
                    error: 'key is required'
                });
                return;
            }

            const days = parseInt(String(req.query.days || '7'));
            const keyStr = String(key);
            const history = await kpiService.getKpiHistory(keyStr, days);

            res.json({
                success: true,
                data: history,
                key,
                days
            });
        } catch (error: any) {
            console.error('[KPI] Error getting history:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get history'
            });
        }
    });

    return router;
}
