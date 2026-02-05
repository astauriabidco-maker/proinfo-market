/**
 * Rule Engine
 * Moteur d'évaluation des règles CTO
 * 
 * DÉTERMINISTE : Le moteur applique les règles, il ne les invente pas.
 */

import { RuleType } from '@prisma/client';
import {
    CtoRuleEntity,
    CtoRuleSetEntity,
    CompatibilityRulePayload,
    QuantityRulePayload,
    DependencyRulePayload,
    ExclusionRulePayload,
    RuleEvaluationResult
} from './rule.types';
import { CtoComponent, CtoValidationError } from '../domain/ctoConfiguration.types';

export class RuleEngine {
    /**
     * Évalue toutes les règles de validation (COMPATIBILITY, QUANTITY, DEPENDENCY, EXCLUSION)
     */
    evaluateValidationRules(
        ruleSet: CtoRuleSetEntity,
        productModel: string,
        components: CtoComponent[]
    ): CtoValidationError[] {
        const errors: CtoValidationError[] = [];

        // 1. COMPATIBILITY
        const compatibilityRules = ruleSet.rules.filter(r => r.ruleType === RuleType.COMPATIBILITY);
        for (const rule of compatibilityRules) {
            const result = this.evaluateCompatibility(rule, productModel, components);
            if (!result.passed && result.message) {
                errors.push({
                    code: 'COMPATIBILITY_ERROR',
                    message: result.message,
                    rule: rule.id
                });
            }
        }

        // 2. QUANTITY
        const quantityRules = ruleSet.rules.filter(r => r.ruleType === RuleType.QUANTITY);
        for (const rule of quantityRules) {
            const result = this.evaluateQuantity(rule, productModel, components);
            if (!result.passed && result.message) {
                errors.push({
                    code: 'QUANTITY_ERROR',
                    message: result.message,
                    rule: rule.id
                });
            }
        }

        // 3. DEPENDENCY
        const dependencyRules = ruleSet.rules.filter(r => r.ruleType === RuleType.DEPENDENCY);
        for (const rule of dependencyRules) {
            const result = this.evaluateDependency(rule, components);
            if (!result.passed && result.message) {
                errors.push({
                    code: 'DEPENDENCY_ERROR',
                    message: result.message,
                    rule: rule.id
                });
            }
        }

        // 4. EXCLUSION
        const exclusionRules = ruleSet.rules.filter(r => r.ruleType === RuleType.EXCLUSION);
        for (const rule of exclusionRules) {
            const result = this.evaluateExclusion(rule, components);
            if (!result.passed && result.message) {
                errors.push({
                    code: 'EXCLUSION_ERROR',
                    message: result.message,
                    rule: rule.id
                });
            }
        }

        return errors;
    }

    /**
     * Évalue une règle COMPATIBILITY
     */
    private evaluateCompatibility(
        rule: CtoRuleEntity,
        productModel: string,
        components: CtoComponent[]
    ): RuleEvaluationResult {
        const payload = rule.payload as CompatibilityRulePayload;

        // La règle ne s'applique pas à ce modèle
        if (payload.productModel !== productModel) {
            return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
        }

        // Vérifier chaque composant du type concerné
        for (const component of components) {
            if (component.type === payload.componentType) {
                if (!payload.allowedReferences.includes(component.reference)) {
                    return {
                        ruleId: rule.id,
                        ruleType: rule.ruleType,
                        passed: false,
                        message: `Component ${component.reference} is not compatible with ${productModel}`
                    };
                }
            }
        }

        return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
    }

    /**
     * Évalue une règle QUANTITY
     */
    private evaluateQuantity(
        rule: CtoRuleEntity,
        productModel: string,
        components: CtoComponent[]
    ): RuleEvaluationResult {
        const payload = rule.payload as QuantityRulePayload;

        // La règle ne s'applique pas à ce modèle
        if (payload.productModel !== productModel) {
            return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
        }

        // Calculer la quantité totale pour ce type
        const totalQuantity = components
            .filter(c => c.type === payload.componentType)
            .reduce((sum, c) => sum + c.quantity, 0);

        if (totalQuantity < payload.minQuantity) {
            return {
                ruleId: rule.id,
                ruleType: rule.ruleType,
                passed: false,
                message: `${payload.componentType} quantity ${totalQuantity} is below minimum ${payload.minQuantity}`
            };
        }

        if (totalQuantity > payload.maxQuantity) {
            return {
                ruleId: rule.id,
                ruleType: rule.ruleType,
                passed: false,
                message: `${payload.componentType} quantity ${totalQuantity} exceeds maximum ${payload.maxQuantity}`
            };
        }

        return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
    }

    /**
     * Évalue une règle DEPENDENCY
     */
    private evaluateDependency(
        rule: CtoRuleEntity,
        components: CtoComponent[]
    ): RuleEvaluationResult {
        const payload = rule.payload as DependencyRulePayload;

        // Vérifier si le composant déclencheur est présent
        const hasTriggering = components.some(
            c => c.type === payload.ifComponentType && c.reference === payload.ifComponentReference
        );

        if (!hasTriggering) {
            return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
        }

        // Le composant déclencheur est présent, vérifier la dépendance
        const hasRequired = components.some(
            c => c.type === payload.requiresComponentType &&
                payload.requiresComponentReferences.includes(c.reference)
        );

        if (!hasRequired) {
            return {
                ruleId: rule.id,
                ruleType: rule.ruleType,
                passed: false,
                message: `${payload.ifComponentReference} requires ${payload.requiresComponentType} (${payload.requiresComponentReferences.join(' or ')})`
            };
        }

        return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
    }

    /**
     * Évalue une règle EXCLUSION
     */
    private evaluateExclusion(
        rule: CtoRuleEntity,
        components: CtoComponent[]
    ): RuleEvaluationResult {
        const payload = rule.payload as ExclusionRulePayload;

        const presentReferences = components
            .filter(c => c.type === payload.componentType)
            .map(c => c.reference);

        // Vérifier chaque groupe d'exclusion
        for (const excludedGroup of payload.excludedReferences) {
            const matches = excludedGroup.filter(ref => presentReferences.includes(ref));
            if (matches.length > 1) {
                return {
                    ruleId: rule.id,
                    ruleType: rule.ruleType,
                    passed: false,
                    message: `${payload.componentType}: ${matches.join(' and ')} are mutually exclusive`
                };
            }
        }

        return { ruleId: rule.id, ruleType: rule.ruleType, passed: true };
    }

    /**
     * Génère les tâches d'assemblage
     */
    generateAssemblyTasks(components: CtoComponent[]): string[] {
        const tasks: string[] = [];

        // Ordre standard d'assemblage
        const typeOrder = ['CPU', 'RAM', 'SSD', 'HDD', 'NIC', 'GPU', 'RAID'];

        for (const type of typeOrder) {
            const hasType = components.some(c => c.type === type);
            if (hasType) {
                tasks.push(`INSTALL_${type}`);
            }
        }

        // Toujours terminer par QA
        tasks.push('RUN_QA');

        return tasks;
    }
}
