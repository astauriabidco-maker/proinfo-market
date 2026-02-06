/**
 * CTO Decision Audit Service
 * Service d'audit des décisions CTO
 * 
 * RÈGLES STRICTES :
 * - Append-only : jamais de modification
 * - Traçabilité complète
 * - Explications lisibles
 */

import { PrismaClient, CtoDecisionResult } from '@prisma/client';
import {
    CreateDecisionDto,
    CtoDecisionEntity,
    ConfigurationAudit,
    AuditedDecision,
    AuditNotAvailableError
} from '../domain/ctoDecision.types';
import { CtoRuleEngineService } from './ctoRuleEngine.service';
import { CtoComponent } from '../domain/ctoConfiguration.types';

// ============================================
// SERVICE
// ============================================

export class CtoDecisionAuditService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly ruleEngine: CtoRuleEngineService
    ) { }

    // ============================================
    // DECISION RECORDING
    // ============================================

    /**
     * Enregistrer une décision CTO
     * RÈGLE : Append-only, jamais de modification
     */
    async recordDecision(dto: CreateDecisionDto): Promise<CtoDecisionEntity> {
        const decision = await this.prisma.ctoDecision.create({
            data: {
                configurationId: dto.configurationId,
                ruleVersionId: dto.ruleVersionId,
                result: dto.result as CtoDecisionResult,
                explanations: {
                    create: dto.explanations.map(exp => ({
                        code: exp.code,
                        message: exp.message,
                        severity: exp.severity
                    }))
                }
            },
            include: {
                explanations: true
            }
        });

        console.log(`[CTO] Decision recorded: ${decision.id} (${dto.result})`);

        return {
            id: decision.id,
            configurationId: decision.configurationId,
            ruleVersionId: decision.ruleVersionId,
            result: decision.result as 'ACCEPT' | 'REJECT',
            createdAt: decision.createdAt,
            explanations: decision.explanations.map(exp => ({
                id: exp.id,
                decisionId: exp.decisionId,
                code: exp.code,
                message: exp.message,
                severity: exp.severity as 'ERROR' | 'WARNING' | 'INFO',
                createdAt: exp.createdAt
            }))
        };
    }

    /**
     * Évaluer et enregistrer toutes les décisions pour une configuration
     */
    async evaluateAndRecordConfiguration(
        configurationId: string,
        components: CtoComponent[]
    ): Promise<{ decisions: CtoDecisionEntity[]; overallResult: 'ACCEPT' | 'REJECT' }> {
        const evaluation = await this.ruleEngine.evaluateConfiguration(components);
        const decisions: CtoDecisionEntity[] = [];
        let overallResult: 'ACCEPT' | 'REJECT' = 'ACCEPT';

        for (const rule of evaluation.rules) {
            // Récupérer la version de règle
            const ruleVersion = await this.prisma.ctoRuleVersion.findFirst({
                where: {
                    ruleId: rule.ruleId,
                    version: rule.ruleVersion
                }
            });

            if (!ruleVersion) continue;

            const result: 'ACCEPT' | 'REJECT' = rule.passed ? 'ACCEPT' : 'REJECT';
            if (result === 'REJECT') {
                overallResult = 'REJECT';
            }

            const decision = await this.recordDecision({
                configurationId,
                ruleVersionId: ruleVersion.id,
                result,
                explanations: rule.passed ? [] : [{
                    code: `RULE_${rule.ruleId.toUpperCase()}_FAILED`,
                    message: rule.explanation || 'Rule evaluation failed',
                    severity: rule.logic.action === 'BLOCK' ? 'ERROR' : 'WARNING'
                }]
            });

            decisions.push(decision);
        }

        return { decisions, overallResult };
    }

    // ============================================
    // AUDIT RETRIEVAL
    // ============================================

    /**
     * Récupérer l'audit complet d'une configuration
     * AUDIT-READY
     */
    async getConfigurationAudit(configurationId: string): Promise<ConfigurationAudit> {
        const decisions = await this.prisma.ctoDecision.findMany({
            where: { configurationId },
            include: {
                explanations: true,
                ruleVersion: true
            },
            orderBy: { createdAt: 'asc' }
        });

        if (decisions.length === 0) {
            throw new AuditNotAvailableError(configurationId);
        }

        const auditedDecisions: AuditedDecision[] = decisions.map(d => ({
            decisionId: d.id,
            ruleVersionId: d.ruleVersionId,
            ruleName: d.ruleVersion.name,
            ruleVersion: d.ruleVersion.version,
            result: d.result as 'ACCEPT' | 'REJECT',
            explanations: d.explanations.map(exp => ({
                id: exp.id,
                decisionId: exp.decisionId,
                code: exp.code,
                message: exp.message,
                severity: exp.severity as 'ERROR' | 'WARNING' | 'INFO',
                createdAt: exp.createdAt
            })),
            evaluatedAt: d.createdAt
        }));

        // Déterminer le résultat global
        const hasRejection = auditedDecisions.some(d => d.result === 'REJECT');
        const overallResult: 'ACCEPT' | 'REJECT' = hasRejection ? 'REJECT' : 'ACCEPT';

        return {
            configurationId,
            decisions: auditedDecisions,
            overallResult,
            evaluatedAt: decisions[0]!.createdAt
        };
    }

    /**
     * Vérifier si une configuration a déjà été évaluée
     * RÈGLE : Ne jamais recalculer une configuration validée
     */
    async hasExistingDecisions(configurationId: string): Promise<boolean> {
        const count = await this.prisma.ctoDecision.count({
            where: { configurationId }
        });
        return count > 0;
    }
}
