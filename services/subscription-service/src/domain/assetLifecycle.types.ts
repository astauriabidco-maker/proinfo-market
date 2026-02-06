/**
 * Asset Lifecycle Types
 * Types pour le cycle de vie des assets et reprise
 * 
 * RÈGLE : Traçabilité COMPLÈTE de chaque étape
 */

/**
 * Statut d'une reprise
 */
export type TakebackStatus =
    | 'INITIATED'      // Reprise déclenchée
    | 'COLLECTED'      // Matériel collecté
    | 'DATA_WIPED'     // Données effacées
    | 'RECEIVED_WMS'   // Reçu au WMS
    | 'COMPLETED';     // Terminé

/**
 * Ordre de reprise
 */
export interface TakebackOrderEntity {
    id: string;
    renewalId: string;
    assetId: string;
    serialNumber: string | null;
    status: TakebackStatus;
    collectedAt: Date | null;
    dataWipeConfirmed: boolean;
    dataWipedAt: Date | null;
    receivedWmsAt: Date | null;
    completedAt: Date | null;
    trackingNumber: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * DTO création reprise
 */
export interface CreateTakebackDto {
    renewalId: string;
    assetId: string;
    serialNumber?: string;
    trackingNumber?: string;
    notes?: string;
}

/**
 * Mise à jour statut reprise
 */
export interface UpdateTakebackDto {
    status?: TakebackStatus;
    collectedAt?: string;
    dataWipeConfirmed?: boolean;
    dataWipedAt?: string;
    receivedWmsAt?: string;
    trackingNumber?: string;
    notes?: string;
}

/**
 * Vue de reprise pour affichage
 */
export interface TakebackOrderView {
    id: string;
    assetId: string;
    serialNumber: string | null;
    status: TakebackStatus;
    statusLabel: string;
    dataWipeConfirmed: boolean;
    trackingNumber: string | null;
    createdAt: string;
}

/**
 * Labels des statuts
 */
export const TAKEBACK_STATUS_LABELS: Record<TakebackStatus, string> = {
    INITIATED: 'Reprise initiée',
    COLLECTED: 'Matériel collecté',
    DATA_WIPED: 'Données effacées',
    RECEIVED_WMS: 'Reçu en entrepôt',
    COMPLETED: 'Reprise terminée'
};

// ============================================
// EVENTS
// ============================================

export type SubscriptionEventType =
    | 'ContractCreated'
    | 'RenewalPlanned'
    | 'RenewalNotified'
    | 'RenewalExecuted'
    | 'RenewalCancelled'
    | 'AssetTakebackInitiated'
    | 'AssetTakebackUpdated'
    | 'AssetTakebackCompleted';

export interface SubscriptionEventData {
    eventType: SubscriptionEventType;
    entityType: 'Contract' | 'RenewalPlan' | 'TakebackOrder';
    entityId: string;
    companyId: string;
    data?: Record<string, unknown>;
}

// ============================================
// ERRORS
// ============================================

export class TakebackNotFoundError extends Error {
    constructor(id: string) {
        super(`Takeback order not found: ${id}`);
        this.name = 'TakebackNotFoundError';
    }
}

export class TakebackInvalidTransitionError extends Error {
    constructor(from: TakebackStatus, to: TakebackStatus) {
        super(`Invalid takeback transition: ${from} → ${to}`);
        this.name = 'TakebackInvalidTransitionError';
    }
}
