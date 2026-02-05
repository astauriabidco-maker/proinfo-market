/**
 * Reservation Types
 * Types pour les réservations
 */

/**
 * DTO pour réserver un asset
 */
export interface ReserveAssetDto {
    orderRef: string;
}

/**
 * Entité Réservation
 */
export interface ReservationEntity {
    id: string;
    assetId: string;
    orderRef: string;
    createdAt: Date;
}

/**
 * Résultat de disponibilité
 */
export interface AvailabilityResult {
    available: boolean;
    location: string | null;
    reason?: string;
}

/**
 * Erreur : Asset déjà réservé
 */
export class AssetAlreadyReservedError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly existingOrderRef: string
    ) {
        super(`Asset ${assetId} is already reserved for order ${existingOrderRef}`);
        this.name = 'AssetAlreadyReservedError';
    }
}

/**
 * Erreur : Asset pas réservé
 */
export class AssetNotReservedError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} is not reserved`);
        this.name = 'AssetNotReservedError';
    }
}

/**
 * Erreur : Asset non vendable
 */
export class AssetNotSellableError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly currentStatus: string
    ) {
        super(`Asset ${assetId} is not sellable (status: ${currentStatus})`);
        this.name = 'AssetNotSellableError';
    }
}
