/**
 * Movement Types
 * Types pour les mouvements de stock
 */

import { MovementReason } from '@prisma/client';

/**
 * DTO pour déplacer un asset
 */
export interface MoveAssetDto {
    fromLocation?: string;
    toLocation: string;
    reason: MovementReason;
}

/**
 * Entité Mouvement
 */
export interface MovementEntity {
    id: string;
    assetId: string;
    fromLocation: string | null;
    toLocation: string | null;
    reason: MovementReason;
    createdAt: Date;
}

/**
 * Position courante d'un asset (calculée à partir des mouvements)
 */
export interface AssetPosition {
    assetId: string;
    locationId: string | null;
    locationCode?: string;
    lastMovement?: MovementEntity;
}

/**
 * Erreur : Asset pas d'emplacement connu
 */
export class AssetNotInStockError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} has no known location`);
        this.name = 'AssetNotInStockError';
    }
}

/**
 * Erreur : Emplacement destination obligatoire
 */
export class MissingToLocationError extends Error {
    constructor() {
        super('toLocation is required for movement');
        this.name = 'MissingToLocationError';
    }
}

/**
 * Labels français pour MovementReason
 */
export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
    INTAKE: 'Entrée stock',
    MOVE: 'Déplacement',
    RESERVE: 'Réservation',
    RELEASE: 'Libération',
    SHIP: 'Expédition',
    RETURN: 'Retour'
};
