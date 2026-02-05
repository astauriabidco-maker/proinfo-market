/**
 * WMS Events
 * Émission d'événements domaine (simulation console.log)
 */

import { PickingOrderEntity } from '../domain/picking.types';
import { AssemblyOrderEntity } from '../domain/assembly.types';
import { ShipmentEntity } from '../domain/shipment.types';
import { ReturnEntity } from '../domain/return.types';

/**
 * Événement : Picking créé
 */
export interface PickingCreatedEvent {
    eventType: 'PickingCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        pickingId: string;
        assetId: string;
    };
}

/**
 * Événement : Picking complété
 */
export interface PickingCompletedEvent {
    eventType: 'PickingCompleted';
    version: '1.0';
    timestamp: Date;
    payload: {
        pickingId: string;
        assetId: string;
    };
}

/**
 * Événement : Assemblage complété
 */
export interface AssemblyCompletedEvent {
    eventType: 'AssemblyCompleted';
    version: '1.0';
    timestamp: Date;
    payload: {
        assemblyId: string;
        assetId: string;
        tasksCount: number;
    };
}

/**
 * Événement : Asset expédié
 */
export interface AssetShippedEvent {
    eventType: 'AssetShipped';
    version: '1.0';
    timestamp: Date;
    payload: {
        shipmentId: string;
        assetId: string;
        carrier: string;
    };
}

/**
 * Événement : Asset retourné
 */
export interface AssetReturnedEvent {
    eventType: 'AssetReturned';
    version: '1.0';
    timestamp: Date;
    payload: {
        returnId: string;
        assetId: string;
        reason: string;
    };
}

/**
 * Émet l'événement PickingCreated
 */
export function emitPickingCreated(picking: PickingOrderEntity): void {
    const event: PickingCreatedEvent = {
        eventType: 'PickingCreated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            pickingId: picking.id,
            assetId: picking.assetId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement PickingCompleted
 */
export function emitPickingCompleted(picking: PickingOrderEntity): void {
    const event: PickingCompletedEvent = {
        eventType: 'PickingCompleted',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            pickingId: picking.id,
            assetId: picking.assetId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement AssemblyCompleted
 */
export function emitAssemblyCompleted(assembly: AssemblyOrderEntity): void {
    const event: AssemblyCompletedEvent = {
        eventType: 'AssemblyCompleted',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assemblyId: assembly.id,
            assetId: assembly.assetId,
            tasksCount: assembly.tasks.length
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement AssetShipped
 */
export function emitAssetShipped(shipment: ShipmentEntity): void {
    const event: AssetShippedEvent = {
        eventType: 'AssetShipped',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            shipmentId: shipment.id,
            assetId: shipment.assetId,
            carrier: shipment.carrier
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement AssetReturned
 */
export function emitAssetReturned(ret: ReturnEntity): void {
    const event: AssetReturnedEvent = {
        eventType: 'AssetReturned',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            returnId: ret.id,
            assetId: ret.assetId,
            reason: ret.reason
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
