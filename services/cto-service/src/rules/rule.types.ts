/**
 * Rule Types
 * Types pour le moteur de règles CTO
 */

import { RuleType } from '@prisma/client';

/**
 * Règle CTO générique
 */
export interface CtoRuleEntity {
    id: string;
    ruleSetId: string;
    ruleType: RuleType;
    payload: unknown;
}

/**
 * RuleSet CTO
 */
export interface CtoRuleSetEntity {
    id: string;
    version: number;
    active: boolean;
    createdAt: Date;
    rules: CtoRuleEntity[];
}

/**
 * Payload règle COMPATIBILITY
 * Ex: CPU XEON-GOLD-6230 compatible avec modèle R740
 */
export interface CompatibilityRulePayload {
    productModel: string;
    componentType: string;
    allowedReferences: string[];
}

/**
 * Payload règle QUANTITY
 * Ex: Maximum 2 CPU pour R740
 */
export interface QuantityRulePayload {
    productModel: string;
    componentType: string;
    minQuantity: number;
    maxQuantity: number;
}

/**
 * Payload règle DEPENDENCY
 * Ex: Si SSD NVME, alors besoin carte RAID
 */
export interface DependencyRulePayload {
    ifComponentType: string;
    ifComponentReference: string;
    requiresComponentType: string;
    requiresComponentReferences: string[];
}

/**
 * Payload règle EXCLUSION
 * Ex: RAM DDR4 et DDR5 mutuellement exclusifs
 */
export interface ExclusionRulePayload {
    componentType: string;
    excludedReferences: string[][];
}

/**
 * Payload règle PRICING
 */
export interface PricingRulePayload {
    componentType: string;
    reference?: string;
    unitPrice: number;
    laborCost: number;
    marginPercent: number;
}

/**
 * Payload règle LEAD_TIME
 */
export interface LeadTimeRulePayload {
    componentType?: string;
    assemblyMinutes: number;
    qaMinutes: number;
}

/**
 * Résultat d'évaluation d'une règle
 */
export interface RuleEvaluationResult {
    ruleId: string;
    ruleType: RuleType;
    passed: boolean;
    message?: string;
}
