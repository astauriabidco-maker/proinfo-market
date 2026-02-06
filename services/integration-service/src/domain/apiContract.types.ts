/**
 * API Contract Types
 * Types pour les contrats d'API versionnés
 * 
 * RÈGLE : Clients s'adaptent à l'API, pas l'inverse
 */

/**
 * Scopes API disponibles
 */
export type ApiScope =
    | 'read:assets'
    | 'read:rse'
    | 'read:sav'
    | 'read:invoices'
    | 'write:sav'
    | 'write:receiving';

/**
 * Descriptions des scopes
 */
export const SCOPE_DESCRIPTIONS: Record<ApiScope, string> = {
    'read:assets': 'Lecture des assets et dossiers machine',
    'read:rse': 'Lecture des rapports RSE',
    'read:sav': 'Lecture des tickets SAV et RMA',
    'read:invoices': 'Lecture des factures',
    'write:sav': 'Création de tickets SAV',
    'write:receiving': 'Confirmation de réception matériel'
};

/**
 * Client API authentifié
 */
export interface AuthenticatedClient {
    id: string;
    name: string;
    companyId: string;
    scopes: ApiScope[];
    rateLimit: number;
}

/**
 * Contexte de requête API
 */
export interface ApiRequestContext {
    client: AuthenticatedClient;
    requestId: string;
    timestamp: Date;
}

/**
 * Réponse API standard
 */
export interface ApiResponse<T> {
    data: T;
    meta: {
        apiVersion: string;
        requestId: string;
        timestamp: string;
    };
}

/**
 * Erreur API standard
 */
export interface ApiError {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    meta: {
        apiVersion: string;
        requestId: string;
        timestamp: string;
    };
}

/**
 * Version API
 */
export const API_VERSION = 'v1';

// ============================================
// ERRORS
// ============================================

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor(public readonly requiredScope: ApiScope) {
        super(`Missing required scope: ${requiredScope}`);
        this.name = 'ForbiddenError';
    }
}

export class RateLimitError extends Error {
    constructor(public readonly retryAfter: number) {
        super(`Rate limit exceeded. Retry after ${retryAfter} seconds.`);
        this.name = 'RateLimitError';
    }
}

export class TenantIsolationError extends Error {
    constructor() {
        super('Cross-tenant access denied');
        this.name = 'TenantIsolationError';
    }
}
