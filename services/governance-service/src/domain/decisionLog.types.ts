/**
 * Decision Log Types
 * RÈGLE : Append-only, jamais modifié
 */

export interface DecisionLogEntity {
    id: string;
    actorId: string;
    actorName: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    context: Record<string, unknown> | null;
    delegatedBy: string | null;
    createdAt: Date;
}

export interface CreateDecisionLogDto {
    actorId: string;
    actorName?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    context?: Record<string, unknown>;
    delegatedBy?: string;
}

export interface DecisionLogView {
    id: string;
    actorId: string;
    actorName: string | null;
    action: string;
    entityType: string | null;
    entityId: string | null;
    context: Record<string, unknown> | null;
    delegatedBy: string | null;
    createdAt: string;
}

export interface DecisionLogQuery {
    period?: 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS';
    actorId?: string;
    action?: string;
    limit?: number;
}

// ============================================
// GOVERNANCE EVENTS
// ============================================

export type GovernanceEventType =
    | 'PermissionGranted'
    | 'PermissionRevoked'
    | 'PermissionDelegated'
    | 'DelegationExpired'
    | 'DelegationRevoked'
    | 'DecisionLogged';
