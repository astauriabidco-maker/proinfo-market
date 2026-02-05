/**
 * Picking Types
 * Types pour les ordres de picking
 */

import { PickingStatus } from '@prisma/client';

/**
 * DTO pour créer un ordre de picking
 */
export interface CreatePickingOrderDto {
    assetId: string;
}

/**
 * Entité Ordre de Picking
 */
export interface PickingOrderEntity {
    id: string;
    assetId: string;
    status: PickingStatus;
    createdAt: Date;
}

/**
 * Erreur : Asset non réservé
 */
export class AssetNotReservedForPickingError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} is not reserved, cannot create picking order`);
        this.name = 'AssetNotReservedForPickingError';
    }
}

/**
 * Erreur : Picking non trouvé
 */
export class PickingOrderNotFoundError extends Error {
    constructor(public readonly pickingId: string) {
        super(`Picking order ${pickingId} not found`);
        this.name = 'PickingOrderNotFoundError';
    }
}

/**
 * Erreur : Picking déjà en cours pour cet asset
 */
export class PickingAlreadyExistsError extends Error {
    constructor(public readonly assetId: string) {
        super(`Active picking order already exists for asset ${assetId}`);
        this.name = 'PickingAlreadyExistsError';
    }
}

/**
 * Erreur : Statut de picking invalide
 */
export class InvalidPickingStatusError extends Error {
    constructor(
        public readonly pickingId: string,
        public readonly currentStatus: PickingStatus,
        public readonly expectedStatus: PickingStatus
    ) {
        super(`Picking ${pickingId} is ${currentStatus}, expected ${expectedStatus}`);
        this.name = 'InvalidPickingStatusError';
    }
}
