/**
 * CTO Rule Engine Service
 * Moteur d'évaluation des règles versionnées
 * 
 * RÈGLES STRICTES :
 * - Évaluation déterministe
 * - Référencement exact des versions
 * - Génération d'explications
 */

import { PrismaClient } from '@prisma/client';
import {
    RuleLogic,
    RuleCondition,
    CtoRuleVersionEntity,
    CreateRuleVersionDto,
    RuleNotFoundError
} from '../domain/ctoRule.types';
import { CtoComponent } from '../domain/ctoConfiguration.types';
import {
    ExplanationSeverity,
    CreateExplanationDto
} from '../domain/ctoDecision.types';
import {
    EvaluatedRule,
    SimulationExplanation
} from '../domain/ctoSimulation.types';

// ============================================
// SERVICE
// ============================================

export class CtoRuleEngineService {
    constructor(private readonly prisma: PrismaClient) { }

    // ============================================
    // RULE VERSION MANAGEMENT
    // ============================================

    /**
     * Créer une nouvelle version de règle
     * RÈGLE : Append-only, jamais de modification
     */
    async createRuleVersion(dto: CreateRuleVersionDto): Promise<CtoRuleVersionEntity> {
        // Récupérer la dernière version pour cette règle
        const latestVersion = await this.prisma.ctoRuleVersion.findFirst({
            where: { ruleId: dto.ruleId },
            orderBy: { version: 'desc' }
        });

        const newVersion = (latestVersion?.version ?? 0) + 1;

        const created = await this.prisma.ctoRuleVersion.create({
            data: {
                ruleId: dto.ruleId,
                version: newVersion,
                name: dto.name,
                description: dto.description,
                logic: dto.logic as any
            }
        });

        console.log(`[CTO] Created rule version: ${dto.ruleId}@v${newVersion}`);

        return {
            id: created.id,
            ruleId: created.ruleId,
            version: created.version,
            name: created.name,
            description: created.description,
            logic: created.logic as unknown as RuleLogic,
            createdAt: created.createdAt
        };
    }

    /**
     * Récupérer la dernière version active d'une règle
     */
    async getLatestRuleVersion(ruleId: string): Promise<CtoRuleVersionEntity | null> {
        const version = await this.prisma.ctoRuleVersion.findFirst({
            where: { ruleId },
            orderBy: { version: 'desc' }
        });

        if (!version) return null;

        return {
            id: version.id,
            ruleId: version.ruleId,
            version: version.version,
            name: version.name,
            description: version.description,
            logic: version.logic as unknown as RuleLogic,
            createdAt: version.createdAt
        };
    }

    /**
     * Récupérer toutes les versions d'une règle
     */
    async getRuleVersionHistory(ruleId: string): Promise<CtoRuleVersionEntity[]> {
        const versions = await this.prisma.ctoRuleVersion.findMany({
            where: { ruleId },
            orderBy: { version: 'desc' }
        });

        return versions.map(v => ({
            id: v.id,
            ruleId: v.ruleId,
            version: v.version,
            name: v.name,
            description: v.description,
            logic: v.logic as unknown as RuleLogic,
            createdAt: v.createdAt
        }));
    }

    /**
     * Récupérer toutes les règles actives (dernières versions)
     */
    async getAllActiveRules(): Promise<CtoRuleVersionEntity[]> {
        // Sous-requête pour obtenir la dernière version de chaque règle
        const latestVersions = await this.prisma.$queryRaw<{ ruleId: string; maxVersion: number }[]>`
            SELECT "ruleId", MAX(version) as "maxVersion"
            FROM "CtoRuleVersion"
            GROUP BY "ruleId"
        `;

        const results: CtoRuleVersionEntity[] = [];
        for (const { ruleId, maxVersion } of latestVersions) {
            const version = await this.prisma.ctoRuleVersion.findUnique({
                where: { ruleId_version: { ruleId, version: maxVersion } }
            });
            if (version) {
                results.push({
                    id: version.id,
                    ruleId: version.ruleId,
                    version: version.version,
                    name: version.name,
                    description: version.description,
                    logic: version.logic as unknown as RuleLogic,
                    createdAt: version.createdAt
                });
            }
        }

        return results;
    }

    // ============================================
    // RULE EVALUATION
    // ============================================

    /**
     * Évaluer toutes les règles contre une configuration
     * Retourne les règles évaluées avec résultat
     */
    async evaluateConfiguration(
        components: CtoComponent[]
    ): Promise<{ rules: EvaluatedRule[]; passed: boolean; explanations: CreateExplanationDto[] }> {
        const allRules = await this.getAllActiveRules();
        const evaluatedRules: EvaluatedRule[] = [];
        const explanations: CreateExplanationDto[] = [];
        let allPassed = true;

        for (const ruleVersion of allRules) {
            const evaluation = this.evaluateRule(ruleVersion, components);
            evaluatedRules.push(evaluation);

            if (!evaluation.passed) {
                allPassed = false;
                explanations.push({
                    code: `RULE_${ruleVersion.ruleId.toUpperCase()}_FAILED`,
                    message: evaluation.explanation || ruleVersion.logic.message,
                    severity: ruleVersion.logic.action === 'BLOCK' ? 'ERROR' : 'WARNING'
                });
            }
        }

        return { rules: evaluatedRules, passed: allPassed, explanations };
    }

    /**
     * Évaluer une règle unique contre des composants
     * DÉTERMINISTE : même entrée = même sortie
     */
    private evaluateRule(
        ruleVersion: CtoRuleVersionEntity,
        components: CtoComponent[]
    ): EvaluatedRule {
        const logic = ruleVersion.logic;
        let passed = true;
        let explanation: string | undefined;

        // Évaluer chaque condition
        for (const condition of logic.conditions) {
            const conditionResult = this.evaluateCondition(condition, components);
            if (!conditionResult.satisfied) {
                passed = false;
                explanation = this.generateExplanation(logic, condition, components);
                break;
            }
        }

        return {
            ruleId: ruleVersion.ruleId,
            ruleName: ruleVersion.name,
            ruleVersion: ruleVersion.version,
            logic: ruleVersion.logic,
            passed,
            explanation
        };
    }

    /**
     * Évaluer une condition unique
     */
    private evaluateCondition(
        condition: RuleCondition,
        components: CtoComponent[]
    ): { satisfied: boolean; reason?: string } {
        // Parser le champ (ex: "component.type", "component.reference")
        const parts = condition.field.split('.');
        const entity = parts[0];
        const field = parts[1];

        if (!field) {
            return { satisfied: true }; // Condition mal formée, on skip
        }

        if (entity === 'component') {
            for (const component of components) {
                const value = (component as Record<string, any>)[field];
                const matches = this.compareValues(value, condition.operator, condition.value);

                if (condition.operator === 'NOT_EQUALS' && matches) {
                    // Pour NOT_EQUALS, on vérifie qu'aucun composant ne correspond
                    return { satisfied: false, reason: `Component ${component.reference} matches exclusion` };
                }
                if (matches && condition.operator !== 'NOT_EQUALS') {
                    return { satisfied: true };
                }
            }
            // Si on cherchait une correspondance et aucune trouvée
            if (condition.operator !== 'NOT_EQUALS') {
                return { satisfied: false, reason: `No component matches condition` };
            }
        }

        return { satisfied: true };
    }

    /**
     * Comparer deux valeurs selon un opérateur
     */
    private compareValues(
        actual: any,
        operator: RuleCondition['operator'],
        expected: string | number
    ): boolean {
        switch (operator) {
            case 'EQUALS':
                return actual === expected;
            case 'NOT_EQUALS':
                return actual !== expected;
            case 'CONTAINS':
                return String(actual).includes(String(expected));
            case 'GREATER_THAN':
                return Number(actual) > Number(expected);
            case 'LESS_THAN':
                return Number(actual) < Number(expected);
            default:
                return false;
        }
    }

    /**
     * Générer une explication lisible
     */
    private generateExplanation(
        logic: RuleLogic,
        failedCondition: RuleCondition,
        components: CtoComponent[]
    ): string {
        // Remplacer les placeholders dans le message template
        let message = logic.message;
        message = message.replace('{field}', failedCondition.field);
        message = message.replace('{value}', String(failedCondition.value));
        message = message.replace('{operator}', failedCondition.operator);

        // Ajouter le contexte des composants
        const componentRefs = components.map(c => c.reference).join(', ');
        message = message.replace('{components}', componentRefs);

        return message;
    }
}
