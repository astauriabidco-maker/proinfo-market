/**
 * CTO Events
 * Émission d'événements domaine avec logger structuré
 */

import { CtoConfigurationEntity, CtoValidationError } from '../domain/ctoConfiguration.types';
import { logger } from '../utils/logger';

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
    logger.event('CtoValidated', {
        configurationId: config.id,
        assetId: config.assetId,
        priceTotal: config.priceSnapshot.total,
        leadTimeDays: config.leadTimeDays,
        ruleSetId: config.ruleSetId
    });
}

/**
 * Émet l'événement CtoRejected
 */
export function emitCtoRejected(assetId: string, errors: CtoValidationError[]): void {
    logger.event('CtoRejected', {
        assetId,
        errors: errors.map(e => ({ rule: e.rule, message: e.message }))

    });
}
