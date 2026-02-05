/**
 * Quality Events
 * Émission d'événements domaine (simulation console.log)
 */

import { QualityResultEntity, ValidationResult } from '../domain/qualityResult.types';
import { BatteryHealthEntity } from '../domain/battery.types';

/**
 * Événement : Résultat qualité enregistré
 */
export interface QualityResultRecordedEvent {
    eventType: 'QualityResultRecorded';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        checklistItemId: string;
        result: string;
        measuredValue?: string;
    };
}

/**
 * Événement : Santé batterie enregistrée
 */
export interface BatteryHealthRecordedEvent {
    eventType: 'BatteryHealthRecorded';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        stateOfHealth: number;
        cycles: number;
    };
}

/**
 * Événement : Validation qualité réussie
 */
export interface QualityPassedEvent {
    eventType: 'QualityPassed';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        checklistId: string;
        batteryStateOfHealth?: number;
    };
}

/**
 * Événement : Validation qualité échouée
 */
export interface QualityFailedEvent {
    eventType: 'QualityFailed';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        reason: string;
        details: ValidationResult['details'];
    };
}

/**
 * Émet l'événement QualityResultRecorded
 */
export function emitQualityResultRecorded(result: QualityResultEntity): void {
    const event: QualityResultRecordedEvent = {
        eventType: 'QualityResultRecorded',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId: result.assetId,
            checklistItemId: result.checklistItemId,
            result: result.result,
            measuredValue: result.measuredValue ?? undefined
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement BatteryHealthRecorded
 */
export function emitBatteryHealthRecorded(battery: BatteryHealthEntity): void {
    const event: BatteryHealthRecordedEvent = {
        eventType: 'BatteryHealthRecorded',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId: battery.assetId,
            stateOfHealth: battery.stateOfHealth,
            cycles: battery.cycles
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement QualityPassed
 */
export function emitQualityPassed(
    assetId: string,
    checklistId: string,
    batteryStateOfHealth?: number
): void {
    const event: QualityPassedEvent = {
        eventType: 'QualityPassed',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId,
            checklistId,
            batteryStateOfHealth
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement QualityFailed
 */
export function emitQualityFailed(
    assetId: string,
    reason: string,
    details: ValidationResult['details']
): void {
    const event: QualityFailedEvent = {
        eventType: 'QualityFailed',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId,
            reason,
            details
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
