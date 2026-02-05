/**
 * Return Types
 * Types pour les retours (RMA logistique)
 */

import { ReturnStatus } from '@prisma/client';

/**
 * DTO pour créer un retour
 */
export interface CreateReturnDto {
    assetId: string;
    reason: string;
}

/**
 * Entité Retour
 */
export interface ReturnEntity {
    id: string;
    assetId: string;
    reason: string;
    status: ReturnStatus;
    createdAt: Date;
}

/**
 * Erreur : Retour non trouvé
 */
export class ReturnNotFoundError extends Error {
    constructor(public readonly returnId: string) {
        super(`Return ${returnId} not found`);
        this.name = 'ReturnNotFoundError';
    }
}
