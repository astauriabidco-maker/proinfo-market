/**
 * RMA Types
 * Types pour les RMA
 */

import { RmaStatus } from '@prisma/client';

/**
 * Entité RMA
 */
export interface RmaEntity {
    id: string;
    assetId: string;
    ticketId: string;
    status: RmaStatus;
    createdAt: Date;
}

/**
 * Erreur : RMA non trouvé
 */
export class RmaNotFoundError extends Error {
    constructor(public readonly rmaId: string) {
        super(`RMA ${rmaId} not found`);
        this.name = 'RmaNotFoundError';
    }
}

/**
 * Erreur : RMA pas dans le bon statut
 */
export class InvalidRmaStatusError extends Error {
    constructor(
        public readonly rmaId: string,
        public readonly currentStatus: RmaStatus,
        public readonly expectedStatus: RmaStatus
    ) {
        super(`RMA ${rmaId} is in status ${currentStatus}, expected ${expectedStatus}`);
        this.name = 'InvalidRmaStatusError';
    }
}

/**
 * Erreur : RMA déjà résolu
 */
export class RmaAlreadyResolvedError extends Error {
    constructor(public readonly rmaId: string) {
        super(`RMA ${rmaId} is already resolved`);
        this.name = 'RmaAlreadyResolvedError';
    }
}
