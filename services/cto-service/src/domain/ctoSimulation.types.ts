/**
 * CTO Simulation Types
 * Types pour la simulation "what-if"
 * 
 * RÈGLE STRICTE : Lecture seule, jamais de persistance
 */

import { CtoComponent } from './ctoConfiguration.types';
import { RuleLogic } from './ctoRule.types';
import { ExplanationSeverity } from './ctoDecision.types';

/**
 * DTO pour simulation what-if
 */
export interface SimulationRequestDto {
    baseConfigurationId?: string;   // Config existante (optionnel)
    components: CtoComponent[];     // Composants à simuler
}

/**
 * Changement simulé
 */
export interface SimulatedChange {
    componentType: string;
    oldValue?: string;
    newValue: string;
}

/**
 * Résultat de simulation
 */
export interface SimulationResult {
    valid: boolean;
    simulatedAt: Date;
    rulesEvaluated: EvaluatedRule[];
    rulesPassed: string[];
    rulesFailed: string[];
    explanations: SimulationExplanation[];
    // Marqueur explicite : non persisté
    readonly _ephemeral: true;
}

/**
 * Règle évaluée lors de simulation
 */
export interface EvaluatedRule {
    ruleId: string;
    ruleName: string;
    ruleVersion: number;
    logic: RuleLogic;
    passed: boolean;
    explanation?: string;
}

/**
 * Explication de simulation
 */
export interface SimulationExplanation {
    code: string;
    message: string;
    severity: ExplanationSeverity;
    impactedComponents: string[];
}

/**
 * Erreur : Simulation invalide
 */
export class InvalidSimulationError extends Error {
    constructor(public readonly reason: string) {
        super(`Invalid simulation: ${reason}`);
        this.name = 'InvalidSimulationError';
    }
}
