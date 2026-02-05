/**
 * Battery Types
 * Types pour la santé batterie
 */

/**
 * Seuil minimum de State of Health pour validation
 */
export const BATTERY_SOH_THRESHOLD = 85;

/**
 * DTO pour enregistrer la santé batterie
 */
export interface RecordBatteryHealthDto {
    stateOfHealth: number;
    cycles: number;
}

/**
 * Entité Santé Batterie
 */
export interface BatteryHealthEntity {
    assetId: string;
    stateOfHealth: number;
    cycles: number;
    measuredAt: Date;
}

/**
 * Erreur : State of Health invalide
 */
export class InvalidStateOfHealthError extends Error {
    constructor(public readonly stateOfHealth: number) {
        super(`State of health ${stateOfHealth} is invalid, must be between 0 and 100`);
        this.name = 'InvalidStateOfHealthError';
    }
}

/**
 * Erreur : Batterie requise mais non mesurée
 */
export class BatteryHealthRequiredError extends Error {
    constructor(public readonly assetId: string) {
        super(`Battery health measurement required for asset ${assetId}`);
        this.name = 'BatteryHealthRequiredError';
    }
}
