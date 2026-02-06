/**
 * Operator Domain Types
 * Types pour les opérateurs WMS Sprint 17
 */

// ========== ENTITIES ==========

export interface OperatorEntity {
    id: string;
    name: string;
    badge: string;
    createdAt: Date;
}

// ========== DTOs ==========

export interface CreateOperatorDto {
    name: string;
    badge: string;
}

// ========== ERRORS ==========

/**
 * Erreur : Badge opérateur déjà utilisé
 */
export class DuplicateBadgeError extends Error {
    constructor(public readonly badge: string) {
        super(`Operator badge "${badge}" already exists`);
        this.name = 'DuplicateBadgeError';
    }
}
