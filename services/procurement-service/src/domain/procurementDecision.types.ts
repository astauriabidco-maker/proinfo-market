/**
 * Procurement Decision Types
 * Types pour la simulation de marge et les décisions d'approvisionnement
 * 
 * RÈGLE : Le système éclaire la décision, l'humain tranche.
 */

import { ProcurementDecision } from '@prisma/client';

// Re-export Prisma enum
export { ProcurementDecision };

// ============================================
// CONSTANTS
// ============================================

/**
 * Seuil de marge minimum (%)
 * Si marge < 10% → REJECT
 */
export const MIN_MARGIN_THRESHOLD = 10;

/**
 * Coût moyen de reconditionnement par unité (€)
 */
export const AVG_RECONDITIONING_COST = 50;

/**
 * Coût moyen d'un RMA (€)
 */
export const AVG_RMA_COST = 150;

/**
 * Taux de RMA par défaut si pas de données (%)
 */
export const DEFAULT_RMA_RATE = 3;

// ============================================
// SIMULATION REQUEST
// ============================================

export interface SimulationRequest {
    supplier: string;
    model: string;
    quantity: number;
    unitCost: number;
}

// ============================================
// SIMULATION RESULT
// ============================================

export interface CostBreakdown {
    purchaseCost: number;       // unitCost × quantity
    reconditioningCost: number; // quantity × AVG_RECONDITIONING_COST
    rmaCost: number;            // quantity × rmaRate × AVG_RMA_COST
    totalCost: number;
}

export interface SimulationResult {
    request: SimulationRequest;
    costs: CostBreakdown;
    estimatedValue: number;     // quantity × avgSellPrice
    estimatedMargin: number;    // (value - cost) / value × 100
    marginAbsolute: number;     // value - cost
    suggestedDecision: ProcurementDecision;
    decisionReason: string;
    warnings: string[];
    calculatedAt: Date;
}

// ============================================
// DECISION RECORDING
// ============================================

export interface RecordDecisionDto {
    supplier: string;
    supplierType: 'LEASING' | 'ENTERPRISE' | 'INDIVIDUAL';
    model: string;
    quantity: number;
    unitCost: number;
    totalPurchasePrice: number;
    estimatedValue: number;
    estimatedMargin: number;
    decision: ProcurementDecision;
    comment?: string;
}

// ============================================
// HISTORY FILTERS
// ============================================

export interface LotHistoryFilter {
    supplier?: string;
    model?: string;
    decision?: ProcurementDecision;
    fromDate?: Date;
    toDate?: Date;
}

// ============================================
// EVENTS
// ============================================

export function emitSimulationRun(result: SimulationResult): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'ProcurementSimulationRun',
        supplier: result.request.supplier,
        model: result.request.model,
        quantity: result.request.quantity,
        estimatedMargin: result.estimatedMargin,
        suggestedDecision: result.suggestedDecision,
        timestamp: new Date().toISOString()
    }));
}

export function emitDecisionProposed(decision: ProcurementDecision, reason: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'ProcurementDecisionProposed',
        decision,
        reason,
        timestamp: new Date().toISOString()
    }));
}

export function emitDecisionRecorded(lotId: string, decision: ProcurementDecision): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'ProcurementDecisionRecorded',
        lotId,
        decision,
        timestamp: new Date().toISOString()
    }));
}

// ============================================
// ERRORS
// ============================================

export class InvalidSimulationRequestError extends Error {
    constructor(message: string) {
        super(`Invalid simulation request: ${message}`);
        this.name = 'InvalidSimulationRequestError';
    }
}

export class LotNotFoundError extends Error {
    constructor(lotId: string) {
        super(`Lot ${lotId} not found`);
        this.name = 'LotNotFoundError';
    }
}
