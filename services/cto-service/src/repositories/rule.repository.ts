/**
 * Rule Repository
 * Couche d'accès aux données pour les règles CTO
 */

import { PrismaClient, CtoRuleSet, CtoRule, RuleType } from '@prisma/client';
import { CtoRuleSetEntity, CtoRuleEntity } from '../rules/rule.types';

export class RuleRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Récupère le RuleSet actif
     */
    async findActiveRuleSet(): Promise<CtoRuleSetEntity | null> {
        const ruleSet = await this.prisma.ctoRuleSet.findFirst({
            where: { active: true },
            include: { rules: true },
            orderBy: { version: 'desc' }
        });
        return ruleSet ? this.toEntity(ruleSet) : null;
    }

    /**
     * Récupère un RuleSet par ID
     */
    async findRuleSetById(id: string): Promise<CtoRuleSetEntity | null> {
        const ruleSet = await this.prisma.ctoRuleSet.findUnique({
            where: { id },
            include: { rules: true }
        });
        return ruleSet ? this.toEntity(ruleSet) : null;
    }

    /**
     * Récupère les règles par type
     */
    async findRulesByType(ruleSetId: string, ruleType: RuleType): Promise<CtoRuleEntity[]> {
        const rules = await this.prisma.ctoRule.findMany({
            where: { ruleSetId, ruleType }
        });
        return rules.map(r => this.toRuleEntity(r));
    }

    /**
     * Convertit en entité RuleSet
     */
    private toEntity(ruleSet: CtoRuleSet & { rules: CtoRule[] }): CtoRuleSetEntity {
        return {
            id: ruleSet.id,
            version: ruleSet.version,
            active: ruleSet.active,
            createdAt: ruleSet.createdAt,
            rules: ruleSet.rules.map(r => this.toRuleEntity(r))
        };
    }

    /**
     * Convertit en entité Rule
     */
    private toRuleEntity(rule: CtoRule): CtoRuleEntity {
        return {
            id: rule.id,
            ruleSetId: rule.ruleSetId,
            ruleType: rule.ruleType,
            payload: rule.payload
        };
    }
}
