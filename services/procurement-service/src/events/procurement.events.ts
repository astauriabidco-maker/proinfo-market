/**
 * Procurement Events
 * Émission d'événements domaine (simulation console.log)
 */

import { ProcurementLotEntity, ProcurementLotItemEntity } from '../domain/procurement.types';

/**
 * Payload de l'événement ProcurementLotCreated
 */
export interface ProcurementLotCreatedEvent {
    eventType: 'ProcurementLotCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        lotId: string;
        supplierName: string;
        supplierType: string;
        totalUnitsDeclared: number;
        totalPurchasePrice: string;
    };
}

/**
 * Payload de l'événement AssetIntaked
 */
export interface AssetIntakedEvent {
    eventType: 'AssetIntaked';
    version: '1.0';
    timestamp: Date;
    payload: {
        lotId: string;
        assetId: string;
        serialNumber: string;
        unitCost: string;
        intakePosition: number;
        totalDeclared: number;
    };
}

/**
 * Émet un événement ProcurementLotCreated
 */
export function emitProcurementLotCreated(lot: ProcurementLotEntity): void {
    const event: ProcurementLotCreatedEvent = {
        eventType: 'ProcurementLotCreated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            lotId: lot.id,
            supplierName: lot.supplierName,
            supplierType: lot.supplierType,
            totalUnitsDeclared: lot.totalUnitsDeclared,
            totalPurchasePrice: lot.totalPurchasePrice.toString()
        }
    };

    // Simulation : log console (pas de Kafka dans ce sprint)
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet un événement AssetIntaked
 */
export function emitAssetIntaked(
    lot: ProcurementLotEntity,
    item: ProcurementLotItemEntity,
    serialNumber: string,
    intakePosition: number
): void {
    const event: AssetIntakedEvent = {
        eventType: 'AssetIntaked',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            lotId: lot.id,
            assetId: item.assetId,
            serialNumber,
            unitCost: item.unitCost.toString(),
            intakePosition,
            totalDeclared: lot.totalUnitsDeclared
        }
    };

    // Simulation : log console (pas de Kafka dans ce sprint)
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
