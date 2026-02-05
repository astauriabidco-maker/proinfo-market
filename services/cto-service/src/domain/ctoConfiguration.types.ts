/**
 * CTO Configuration Types
 * Types pour les configurations CTO
 */

/**
 * Composant d'une configuration
 */
export interface CtoComponent {
    type: string;
    reference: string;
    quantity: number;
}

/**
 * DTO pour valider une configuration CTO
 */
export interface ValidateCtoDto {
    assetId: string;
    productModel: string;
    components: CtoComponent[];
}

/**
 * Résultat de validation CTO
 */
export interface CtoValidationResult {
    valid: boolean;
    configurationId?: string;
    errors: CtoValidationError[];
    priceSnapshot?: PriceSnapshot;
    leadTimeDays?: number;
    assemblyOrder?: AssemblyOrder;
}

/**
 * Erreur de validation
 */
export interface CtoValidationError {
    code: string;
    message: string;
    component?: string;
    rule?: string;
}

/**
 * Snapshot de prix (FIGÉ)
 */
export interface PriceSnapshot {
    components: ComponentPrice[];
    laborCost: number;
    subtotal: number;
    margin: number;
    total: number;
    currency: string;
    frozenAt: Date;
}

/**
 * Prix d'un composant
 */
export interface ComponentPrice {
    type: string;
    reference: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

/**
 * Ordre d'assemblage pour le WMS
 */
export interface AssemblyOrder {
    assetId: string;
    tasks: string[];
}

/**
 * Entité Configuration CTO
 */
export interface CtoConfigurationEntity {
    id: string;
    assetId: string;
    configuration: CtoComponent[];
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    ruleSetId: string;
    validated: boolean;
    createdAt: Date;
}

/**
 * Erreur : Asset non vendable
 */
export class AssetNotSellableError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly currentStatus: string
    ) {
        super(`Asset ${assetId} is not sellable (status: ${currentStatus})`);
        this.name = 'AssetNotSellableError';
    }
}

/**
 * Erreur : RuleSet non trouvé
 */
export class NoActiveRuleSetError extends Error {
    constructor() {
        super('No active CTO RuleSet found');
        this.name = 'NoActiveRuleSetError';
    }
}

/**
 * Erreur : Configuration invalide
 */
export class InvalidConfigurationError extends Error {
    constructor(
        public readonly errors: CtoValidationError[]
    ) {
        super(`Configuration validation failed: ${errors.map(e => e.message).join(', ')}`);
        this.name = 'InvalidConfigurationError';
    }
}

/**
 * Erreur : Stock insuffisant
 */
export class InsufficientStockError extends Error {
    constructor(
        public readonly component: string,
        public readonly required: number,
        public readonly available: number
    ) {
        super(`Insufficient stock for ${component}: required ${required}, available ${available}`);
        this.name = 'InsufficientStockError';
    }
}

/**
 * Erreur : Configuration non trouvée
 */
export class ConfigurationNotFoundError extends Error {
    constructor(public readonly configurationId: string) {
        super(`Configuration ${configurationId} not found`);
        this.name = 'ConfigurationNotFoundError';
    }
}
