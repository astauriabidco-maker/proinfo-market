/**
 * CTO Decisions Routes
 * API REST pour l'audit des décisions CTO
 * 
 * RÈGLE : Lecture seule, audit-ready
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CtoDecisionAuditService } from '../services/ctoDecisionAudit.service';
import { CtoRuleEngineService } from '../services/ctoRuleEngine.service';
import { AuditNotAvailableError } from '../domain/ctoDecision.types';

export function createCtoDecisionsRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const ruleEngine = new CtoRuleEngineService(prisma);
    const auditService = new CtoDecisionAuditService(prisma, ruleEngine);

    /**
     * GET /cto/decisions/:configurationId
     * Audit complet d'une configuration
     * 
     * Retourne :
     * - Règles appliquées
     * - Versions utilisées
     * - Explications
     * - Horodatage
     */
    router.get('/:configurationId', async (req: Request, res: Response): Promise<void> => {
        try {
            const { configurationId } = req.params;

            const audit = await auditService.getConfigurationAudit(configurationId);

            res.json({
                success: true,
                data: {
                    configurationId: audit.configurationId,
                    overallResult: audit.overallResult,
                    evaluatedAt: audit.evaluatedAt,
                    decisions: audit.decisions.map(d => ({
                        ruleId: d.ruleVersionId,
                        ruleName: d.ruleName,
                        ruleVersion: d.ruleVersion,
                        result: d.result,
                        explanations: d.explanations.map(exp => ({
                            code: exp.code,
                            message: exp.message,
                            severity: exp.severity
                        })),
                        evaluatedAt: d.evaluatedAt
                    })),
                    totalRulesEvaluated: audit.decisions.length,
                    rulesPassed: audit.decisions.filter(d => d.result === 'ACCEPT').length,
                    rulesFailed: audit.decisions.filter(d => d.result === 'REJECT').length
                }
            });
        } catch (error: any) {
            if (error instanceof AuditNotAvailableError) {
                res.status(404).json({
                    success: false,
                    error: error.message
                });
                return;
            }

            console.error('[CTO] Error getting audit:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /cto/decisions/:configurationId/summary
     * Résumé rapide de l'audit
     */
    router.get('/:configurationId/summary', async (req: Request, res: Response): Promise<void> => {
        try {
            const { configurationId } = req.params;

            const hasDecisions = await auditService.hasExistingDecisions(configurationId);
            if (!hasDecisions) {
                res.status(404).json({
                    success: false,
                    error: `No audit available for configuration ${configurationId}`
                });
                return;
            }

            const audit = await auditService.getConfigurationAudit(configurationId);

            res.json({
                success: true,
                configurationId,
                result: audit.overallResult,
                totalRules: audit.decisions.length,
                passed: audit.decisions.filter(d => d.result === 'ACCEPT').length,
                failed: audit.decisions.filter(d => d.result === 'REJECT').length,
                evaluatedAt: audit.evaluatedAt
            });
        } catch (error: any) {
            console.error('[CTO] Error getting audit summary:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
