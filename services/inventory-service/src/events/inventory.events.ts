/**
 * Inventory Events
 * Émission d'événements domaine avec logger structuré
 */

import { MovementEntity } from '../domain/movement.types';
import { ReservationEntity } from '../domain/reservation.types';
import { logger } from '../utils/logger';

/**
 * Événement : Asset déplacé
 */
export interface AssetMovedEvent {
    eventType: 'AssetMoved';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        fromLocation: string | null;
        toLocation: string | null;
        reason: string;
        movementId: string;
    };
}

/**
 * Événement : Asset réservé
 */
export interface AssetReservedEvent {
    eventType: 'AssetReserved';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        orderRef: string;
        reservationId: string;
    };
}

/**
 * Événement : Réservation libérée
 */
export interface AssetReservationReleasedEvent {
    eventType: 'AssetReservationReleased';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        orderRef: string;
    };
}

/**
 * Émet l'événement AssetMoved
 */
export function emitAssetMoved(movement: MovementEntity): void {
    logger.event('AssetMoved', {
        assetId: movement.assetId,
        fromLocation: movement.fromLocation,
        toLocation: movement.toLocation,
        reason: movement.reason,
        movementId: movement.id
    });
}

/**
 * Émet l'événement AssetReserved
 */
export function emitAssetReserved(reservation: ReservationEntity): void {
    logger.event('AssetReserved', {
        assetId: reservation.assetId,
        orderRef: reservation.orderRef,
        reservationId: reservation.id
    });
}

/**
 * Émet l'événement AssetReservationReleased
 */
export function emitAssetReservationReleased(
    assetId: string,
    orderRef: string
): void {
    logger.event('AssetReservationReleased', { assetId, orderRef });
}
