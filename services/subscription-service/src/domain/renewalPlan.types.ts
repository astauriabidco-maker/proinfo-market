/**
 * Renewal Plan Types
 * Types pour la planification du renouvellement
 * 
 * RÈGLE : Proposition, pas obligation
 * RÈGLE : Pas de renouvellement tacite
 */

/**
 * Statut d'un plan de renouvellement
 */
export type RenewalStatus = 'PLANNED' | 'NOTIFIED' | 'EXECUTED' | 'CANCELLED';

/**
 * Plan de renouvellement
 */
export interface RenewalPlanEntity {
    id: string;
    contractId: string;
    plannedDate: Date;
    status: RenewalStatus;
    notifiedAt90: Date | null;
    notifiedAt60: Date | null;
    notifiedAt30: Date | null;
    executedAt: Date | null;
    executedBy: string | null;
    createdAt: Date;
}

/**
 * Vue de renouvellement pour affichage
 */
export interface RenewalPlanView {
    id: string;
    contractId: string;
    companyName: string;
    plannedDate: string;
    status: RenewalStatus;
    daysUntilRenewal: number;
    notifications: {
        at90: boolean;
        at60: boolean;
        at30: boolean;
    };
}

/**
 * Exécution de renouvellement
 */
export interface ExecuteRenewalDto {
    executedBy: string;
    notes?: string;
}

/**
 * Notifications à envoyer
 */
export interface PendingNotification {
    renewalId: string;
    contractId: string;
    companyId: string;
    companyName: string;
    daysRemaining: number;
    notificationType: 'J-90' | 'J-60' | 'J-30';
}

// ============================================
// ERRORS
// ============================================

export class RenewalNotFoundError extends Error {
    constructor(id: string) {
        super(`Renewal plan not found: ${id}`);
        this.name = 'RenewalNotFoundError';
    }
}

export class RenewalAlreadyExecutedError extends Error {
    constructor(id: string) {
        super(`Renewal already executed: ${id}`);
        this.name = 'RenewalAlreadyExecutedError';
    }
}

export class AutoRenewalNotAllowedError extends Error {
    constructor() {
        super('Automatic renewal is not allowed. Renewals must be explicitly executed.');
        this.name = 'AutoRenewalNotAllowedError';
    }
}
