/**
 * CTO Decision Types
 * Types pour les décisions CTO auditables
 * 
 * RÈGLE STRICTE : Append-only, décisions immuables
 */

/**
 * Résultat de décision
 */
export type DecisionResult = 'ACCEPT' | 'REJECT';

/**
 * Sévérité d'une explication
 */
export type ExplanationSeverity = 'ERROR' | 'WARNING' | 'INFO';

/**
 * DTO pour créer une décision
 */
export interface CreateDecisionDto {
    configurationId: string;
    ruleVersionId: string;
    result: DecisionResult;
    explanations: CreateExplanationDto[];
}

/**
 * DTO pour créer une explication
 */
export interface CreateExplanationDto {
    code: string;       // Code machine unique
    message: string;    // Message lisible humain
    severity: ExplanationSeverity;
}

/**
 * Entité CtoDecision
 */
export interface CtoDecisionEntity {
    id: string;
    configurationId: string;
    ruleVersionId: string;
    result: DecisionResult;
    createdAt: Date;
    explanations: CtoExplanationEntity[];
}

/**
 * Entité CtoDecisionExplanation
 */
export interface CtoExplanationEntity {
    id: string;
    decisionId: string;
    code: string;
    message: string;
    severity: ExplanationSeverity;
    createdAt: Date;
}

/**
 * Résultat d'audit pour une configuration
 */
export interface ConfigurationAudit {
    configurationId: string;
    decisions: AuditedDecision[];
    overallResult: DecisionResult;
    evaluatedAt: Date;
}

/**
 * Décision auditée avec détails de version
 */
export interface AuditedDecision {
    decisionId: string;
    ruleVersionId: string;
    ruleName: string;
    ruleVersion: number;
    result: DecisionResult;
    explanations: CtoExplanationEntity[];
    evaluatedAt: Date;
}

/**
 * Erreur : Décision non trouvée
 */
export class DecisionNotFoundError extends Error {
    constructor(public readonly decisionId: string) {
        super(`Decision ${decisionId} not found`);
        this.name = 'DecisionNotFoundError';
    }
}

/**
 * Erreur : Audit non disponible
 */
export class AuditNotAvailableError extends Error {
    constructor(public readonly configurationId: string) {
        super(`No audit available for configuration ${configurationId}`);
        this.name = 'AuditNotAvailableError';
    }
}
