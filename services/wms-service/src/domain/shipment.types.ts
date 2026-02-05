/**
 * Shipment Types
 * Types pour les expéditions
 */

import { ShipmentStatus } from '@prisma/client';

/**
 * DTO pour créer une expédition
 */
export interface CreateShipmentDto {
    assetId: string;
    carrier: string;
}

/**
 * Entité Expédition
 */
export interface ShipmentEntity {
    id: string;
    assetId: string;
    carrier: string;
    trackingRef: string | null;
    status: ShipmentStatus;
    createdAt: Date;
}

/**
 * Erreur : Expédition non trouvée
 */
export class ShipmentNotFoundError extends Error {
    constructor(public readonly shipmentId: string) {
        super(`Shipment ${shipmentId} not found`);
        this.name = 'ShipmentNotFoundError';
    }
}

/**
 * Erreur : Picking non complété
 */
export class PickingNotCompletedError extends Error {
    constructor(public readonly assetId: string) {
        super(`Picking not completed for asset ${assetId}`);
        this.name = 'PickingNotCompletedError';
    }
}

/**
 * Erreur : Assemblage non complété
 */
export class AssemblyNotCompletedError extends Error {
    constructor(public readonly assetId: string) {
        super(`Assembly not completed for asset ${assetId}`);
        this.name = 'AssemblyNotCompletedError';
    }
}
