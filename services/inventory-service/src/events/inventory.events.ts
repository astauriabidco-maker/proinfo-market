/**
 * Inventory Events
 * Émission d'événements domaine (simulation console.log)
 */

import { MovementEntity } from '../domain/movement.types';
import { ReservationEntity } from '../domain/reservation.types';

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
    const event: AssetMovedEvent = {
        eventType: 'AssetMoved',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId: movement.assetId,
            fromLocation: movement.fromLocation,
            toLocation: movement.toLocation,
            reason: movement.reason,
            movementId: movement.id
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement AssetReserved
 */
export function emitAssetReserved(reservation: ReservationEntity): void {
    const event: AssetReservedEvent = {
        eventType: 'AssetReserved',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId: reservation.assetId,
            orderRef: reservation.orderRef,
            reservationId: reservation.id
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement AssetReservationReleased
 */
export function emitAssetReservationReleased(
    assetId: string,
    orderRef: string
): void {
    const event: AssetReservationReleasedEvent = {
        eventType: 'AssetReservationReleased',
        version: '1.0',
        timestamp: new Date(),
        payload: { assetId, orderRef }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
