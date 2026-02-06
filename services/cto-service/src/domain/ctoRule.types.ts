/**
 * CTO Rule Types
 * Types pour les règles CTO versionnées
 * 
 * RÈGLE STRICTE : Append-only, jamais de modification
 */

/**
 * Types de logique supportés
 */
export type RuleLogicType =
    | 'COMPATIBILITY'     // Incompatibilité entre composants
    | 'DEPENDENCY'        // Composant requis si autre présent
    | 'EXCLUSION'         // Composants mutuellement exclusifs
    | 'QUANTITY'          // Contrainte de quantité
    | 'POWER'             // Contrainte d'alimentation
    | 'THERMAL';          // Contrainte thermique

/**
 * Logique structurée d'une règle (JSON stocké en BDD)
 */
export interface RuleLogic {
    type: RuleLogicType;
    conditions: RuleCondition[];
    action: 'BLOCK' | 'WARN';
    message: string;  // Template avec placeholders
}

/**
 * Condition d'une règle
 */
export interface RuleCondition {
    field: string;      // Ex: "component.type", "component.reference"
    operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value: string | number;
}

/**
 * DTO pour créer une nouvelle version de règle
 */
export interface CreateRuleVersionDto {
    ruleId: string;
    name: string;
    description: string;
    logic: RuleLogic;
}

/**
 * Entité CtoRuleVersion
 */
export interface CtoRuleVersionEntity {
    id: string;
    ruleId: string;
    version: number;
    name: string;
    description: string;
    logic: RuleLogic;
    createdAt: Date;
}

/**
 * Erreur : Version de règle non trouvée
 */
export class RuleVersionNotFoundError extends Error {
    constructor(public readonly ruleId: string, public readonly version: number) {
        super(`Rule version ${ruleId}@v${version} not found`);
        this.name = 'RuleVersionNotFoundError';
    }
}

/**
 * Erreur : Règle non trouvée
 */
export class RuleNotFoundError extends Error {
    constructor(public readonly ruleId: string) {
        super(`Rule ${ruleId} not found`);
        this.name = 'RuleNotFoundError';
    }
}
