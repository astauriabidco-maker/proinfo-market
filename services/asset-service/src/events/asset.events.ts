/**
 * Asset Events
 * Émission d'événements domaine (simulation console.log)
 */

import { AssetEntity } from '../domain/asset.types';
import { AssetStatus } from '@prisma/client';

/**
 * Payload de l'événement AssetCreated
 */
export interface AssetCreatedEvent {
    eventType: 'AssetCreated';
    timestamp: Date;
    payload: {
        assetId: string;
        serialNumber: string;
        assetType: string;
        brand: string;
        model: string;
        status: AssetStatus;
    };
}

/**
 * Payload de l'événement AssetStatusChanged
 */
export interface AssetStatusChangedEvent {
    eventType: 'AssetStatusChanged';
    timestamp: Date;
    payload: {
        assetId: string;
        serialNumber: string;
        previousStatus: AssetStatus;
        newStatus: AssetStatus;
        reason?: string;
    };
}

/**
 * Émet un événement AssetCreated
 * 
 * @param asset - L'asset créé
 */
export function emitAssetCreated(asset: AssetEntity): void {
    const event: AssetCreatedEvent = {
        eventType: 'AssetCreated',
        timestamp: new Date(),
        payload: {
            assetId: asset.id,
            serialNumber: asset.serialNumber,
            assetType: asset.assetType,
            brand: asset.brand,
            model: asset.model,
            status: asset.status
        }
    };

    // Simulation : log console (pas de Kafka dans ce sprint)
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet un événement AssetStatusChanged
 * 
 * @param asset - L'asset mis à jour
 * @param previousStatus - Le statut précédent
 * @param reason - Raison du changement (optionnel)
 */
export function emitAssetStatusChanged(
    asset: AssetEntity,
    previousStatus: AssetStatus,
    reason?: string
): void {
    const event: AssetStatusChangedEvent = {
        eventType: 'AssetStatusChanged',
        timestamp: new Date(),
        payload: {
            assetId: asset.id,
            serialNumber: asset.serialNumber,
            previousStatus,
            newStatus: asset.status,
            reason
        }
    };

    // Simulation : log console (pas de Kafka dans ce sprint)
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
