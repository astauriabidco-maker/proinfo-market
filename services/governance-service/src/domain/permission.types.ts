/**
 * Permission Types
 * RÈGLE : Permissions explicites uniquement
 */

export interface PermissionEntity {
    id: string;
    code: string;
    description: string | null;
    critical: boolean;
    createdAt: Date;
}

/**
 * Permissions prédéfinies
 */
export const PERMISSION_CODES = {
    // RMA & SAV
    APPROVE_RMA: 'APPROVE_RMA',
    REJECT_RMA: 'REJECT_RMA',

    // Procurement
    VALIDATE_PROCUREMENT: 'VALIDATE_PROCUREMENT',
    CANCEL_PROCUREMENT: 'CANCEL_PROCUREMENT',

    // Inventory
    UNLOCK_STOCK: 'UNLOCK_STOCK',
    SCRAP_ASSET: 'SCRAP_ASSET',

    // Quality
    QUALITY_DEROGATION: 'QUALITY_DEROGATION',

    // Contracts
    CLOSE_CONTRACT: 'CLOSE_CONTRACT',
    EXECUTE_RENEWAL: 'EXECUTE_RENEWAL',

    // Governance
    MANAGE_ROLES: 'MANAGE_ROLES',
    DELEGATE_PERMISSION: 'DELEGATE_PERMISSION'
} as const;

export type PermissionCode = typeof PERMISSION_CODES[keyof typeof PERMISSION_CODES];

/**
 * Permissions critiques (nécessitent DecisionLog)
 */
export const CRITICAL_PERMISSIONS: PermissionCode[] = [
    'APPROVE_RMA',
    'VALIDATE_PROCUREMENT',
    'SCRAP_ASSET',
    'QUALITY_DEROGATION',
    'CLOSE_CONTRACT',
    'EXECUTE_RENEWAL',
    'MANAGE_ROLES'
];

// ============================================
// ERRORS
// ============================================

export class PermissionDeniedError extends Error {
    constructor(userId: string, permission: string) {
        super(`Permission denied: ${permission} for user ${userId}`);
        this.name = 'PermissionDeniedError';
    }
}

export class UnauthorizedOverrideError extends Error {
    constructor() {
        super('Unauthorized override attempt - no bypass allowed');
        this.name = 'UnauthorizedOverrideError';
    }
}
