/**
 * CTO Simulation Routes
 * API REST pour la simulation "what-if"
 * 
 * RÈGLE STRICTE :
 * - Lecture seule
 * - Jamais de persistance
 * - Résultats éphémères
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CtoSimulationService } from '../services/ctoSimulation.service';
import { CtoRuleEngineService } from '../services/ctoRuleEngine.service';
import { SimulationRequestDto, InvalidSimulationError } from '../domain/ctoSimulation.types';

export function createCtoSimulationRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const ruleEngine = new CtoRuleEngineService(prisma);
    const simulationService = new CtoSimulationService(prisma, ruleEngine);

    /**
     * POST /cto/simulate
     * Simulation what-if
     * 
     * RÈGLES :
     * - Ne persiste JAMAIS
     * - Ne modifie JAMAIS la config source
     * - Retourne un résultat éphémère
     */
    router.post('/', async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: SimulationRequestDto = {
                baseConfigurationId: req.body.baseConfigurationId,
                components: req.body.components || []
            };

            const result = await simulationService.simulate(dto);

            res.json({
                success: true,
                _notice: '⚠️ SIMULATION ONLY - Not persisted',
                data: {
                    valid: result.valid,
                    simulatedAt: result.simulatedAt,
                    rulesEvaluated: result.rulesEvaluated.length,
                    rulesPassed: result.rulesPassed,
                    rulesFailed: result.rulesFailed,
                    explanations: result.explanations.map(exp => ({
                        code: exp.code,
                        message: exp.message,
                        severity: exp.severity,
                        impactedComponents: exp.impactedComponents
                    }))
                }
            });
        } catch (error: any) {
            if (error instanceof InvalidSimulationError) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            console.error('[CTO] Simulation error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /cto/simulate/change
     * Simulation d'un changement unique
     */
    router.post('/change', async (req: Request, res: Response): Promise<void> => {
        try {
            const { configurationId, componentType, newReference, quantity } = req.body;

            if (!configurationId || !componentType || !newReference) {
                res.status(400).json({
                    success: false,
                    error: 'configurationId, componentType, and newReference are required'
                });
                return;
            }

            const result = await simulationService.simulateChange(configurationId, {
                componentType,
                newReference,
                quantity
            });

            res.json({
                success: true,
                _notice: '⚠️ SIMULATION ONLY - Not persisted',
                data: {
                    valid: result.valid,
                    change: {
                        componentType,
                        newReference,
                        quantity: quantity ?? 1
                    },
                    rulesFailed: result.rulesFailed,
                    explanations: result.explanations
                }
            });
        } catch (error: any) {
            if (error instanceof InvalidSimulationError) {
                res.status(400).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            console.error('[CTO] Simulation change error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
