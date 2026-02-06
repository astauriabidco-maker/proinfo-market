/**
 * Delegation Types
 * RÈGLE : Temporaire, traçable, révocable
 */

export interface DelegationEntity {
    id: string;
    fromUserId: string;
    toUserId: string;
    permissionId: string;
    reason: string | null;
    expiresAt: Date | null;
    revokedAt: Date | null;
    revokedBy: string | null;
    active: boolean;
    createdAt: Date;
}

export interface CreateDelegationDto {
    fromUserId: string;
    toUserId: string;
    permissionCode: string;
    reason?: string;
    expiresAt?: string;  // ISO date
}

export interface DelegationView {
    id: string;
    fromUserId: string;
    toUserId: string;
    permissionCode: string;
    reason: string | null;
    expiresAt: string | null;
    active: boolean;
    expired: boolean;
    createdAt: string;
}

// ============================================
// ERRORS
// ============================================

export class DelegationNotFoundError extends Error {
    constructor(id: string) {
        super(`Delegation not found: ${id}`);
        this.name = 'DelegationNotFoundError';
    }
}

export class DelegationExpiredError extends Error {
    constructor(id: string) {
        super(`Delegation expired: ${id}`);
        this.name = 'DelegationExpiredError';
    }
}

export class CannotDelegateError extends Error {
    constructor(reason: string) {
        super(`Cannot delegate: ${reason}`);
        this.name = 'CannotDelegateError';
    }
}
