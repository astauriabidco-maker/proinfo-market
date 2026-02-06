/**
 * CTO Rules Routes
 * API REST pour les règles CTO versionnées
 * 
 * RÈGLE : Append-only, jamais de modification
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CtoRuleEngineService } from '../services/ctoRuleEngine.service';
import { CreateRuleVersionDto, RuleLogic } from '../domain/ctoRule.types';

export function createCtoRulesRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const ruleEngine = new CtoRuleEngineService(prisma);

    /**
     * GET /cto/rules
     * Liste toutes les règles actives (dernières versions)
     */
    router.get('/', async (req: Request, res: Response): Promise<void> => {
        try {
            const rules = await ruleEngine.getAllActiveRules();

            res.json({
                success: true,
                data: rules,
                count: rules.length
            });
        } catch (error: any) {
            console.error('[CTO] Error listing rules:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * POST /cto/rules
     * Créer une nouvelle version de règle
     * RÈGLE : Append-only
     */
    router.post('/', async (req: Request, res: Response): Promise<void> => {
        try {
            const dto: CreateRuleVersionDto = {
                ruleId: req.body.ruleId,
                name: req.body.name,
                description: req.body.description,
                logic: req.body.logic as RuleLogic
            };

            // Validation
            if (!dto.ruleId || !dto.name || !dto.logic) {
                res.status(400).json({
                    success: false,
                    error: 'ruleId, name, and logic are required'
                });
                return;
            }

            const ruleVersion = await ruleEngine.createRuleVersion(dto);

            res.status(201).json({
                success: true,
                data: ruleVersion,
                message: `Rule version created: ${dto.ruleId}@v${ruleVersion.version}`
            });
        } catch (error: any) {
            console.error('[CTO] Error creating rule version:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /cto/rules/:ruleId/versions
     * Historique de toutes les versions d'une règle
     */
    router.get('/:ruleId/versions', async (req: Request, res: Response): Promise<void> => {
        try {
            const { ruleId } = req.params;
            const versions = await ruleEngine.getRuleVersionHistory(ruleId);

            res.json({
                success: true,
                ruleId,
                data: versions,
                count: versions.length
            });
        } catch (error: any) {
            console.error('[CTO] Error getting rule versions:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /cto/rules/:ruleId/latest
     * Dernière version d'une règle
     */
    router.get('/:ruleId/latest', async (req: Request, res: Response): Promise<void> => {
        try {
            const { ruleId } = req.params;
            const version = await ruleEngine.getLatestRuleVersion(ruleId);

            if (!version) {
                res.status(404).json({
                    success: false,
                    error: `Rule ${ruleId} not found`
                });
                return;
            }

            res.json({
                success: true,
                data: version
            });
        } catch (error: any) {
            console.error('[CTO] Error getting latest rule:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
