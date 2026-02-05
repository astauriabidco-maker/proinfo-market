/**
 * CTO Events
 * Émission d'événements domaine (simulation console.log)
 */

import { CtoConfigurationEntity, CtoValidationError } from '../domain/ctoConfiguration.types';

/**
 * Événement : CTO validé
 */
export interface CtoValidatedEvent {
    eventType: 'CtoValidated';
    version: '1.0';
    timestamp: Date;
    payload: {
        configurationId: string;
        assetId: string;
        priceTotal: number;
        leadTimeDays: number;
        ruleSetId: string;
    };
}

/**
 * Événement : CTO rejeté
 */
export interface CtoRejectedEvent {
    eventType: 'CtoRejected';
    version: '1.0';
    timestamp: Date;
    payload: {
        assetId: string;
        errors: CtoValidationError[];
    };
}

/**
 * Émet l'événement CtoValidated
 */
export function emitCtoValidated(config: CtoConfigurationEntity): void {
    const event: CtoValidatedEvent = {
        eventType: 'CtoValidated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            configurationId: config.id,
            assetId: config.assetId,
            priceTotal: config.priceSnapshot.total,
            leadTimeDays: config.leadTimeDays,
            ruleSetId: config.ruleSetId
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

/**
 * Émet l'événement CtoRejected
 */
export function emitCtoRejected(assetId: string, errors: CtoValidationError[]): void {
    const event: CtoRejectedEvent = {
        eventType: 'CtoRejected',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            assetId,
            errors
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}
