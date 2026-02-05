/**
 * Pricing Types
 * Types pour le pricing CTO
 */

/**
 * Règle de pricing (payload depuis DB)
 */
export interface PricingRule {
    componentType: string;
    unitPrice: number;
    laborCost: number;
    marginPercent: number;
}

/**
 * Constantes de pricing
 */
export const PRICING_DEFAULTS = {
    DEFAULT_MARGIN_PERCENT: 18,
    DEFAULT_LABOR_COST: 10,
    CURRENCY: 'EUR'
} as const;
