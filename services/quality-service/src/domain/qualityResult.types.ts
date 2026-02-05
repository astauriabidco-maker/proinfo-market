/**
 * Quality Result Types
 * Types pour les résultats de tests qualité
 */

/**
 * Valeurs possibles pour un résultat de test
 */
export type QualityResultValue = 'PASS' | 'FAIL';

/**
 * DTO pour enregistrer un résultat
 */
export interface RecordQualityResultDto {
    checklistItemId: string;
    result: QualityResultValue;
    measuredValue?: string;
}

/**
 * Entité Résultat Qualité
 */
export interface QualityResultEntity {
    id: string;
    assetId: string;
    checklistItemId: string;
    result: string;
    measuredValue: string | null;
    createdAt: Date;
}

/**
 * Résultat de validation globale
 */
export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    details: {
        checklistComplete: boolean;
        missingItems: string[];
        blockingFailures: string[];
        batteryOk: boolean;
        batteryStateOfHealth?: number;
    };
}

/**
 * Erreur : Asset non en état QUALITY_PENDING
 */
export class InvalidAssetStatusError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly currentStatus: string,
        public readonly expectedStatus: string
    ) {
        super(`Asset ${assetId} is in ${currentStatus}, expected ${expectedStatus}`);
        this.name = 'InvalidAssetStatusError';
    }
}

/**
 * Erreur : Résultat déjà enregistré (append-only)
 */
export class QualityResultAlreadyExistsError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly checklistItemId: string
    ) {
        super(`Quality result for asset ${assetId} and item ${checklistItemId} already exists`);
        this.name = 'QualityResultAlreadyExistsError';
    }
}

/**
 * Erreur : Validation échouée
 */
export class QualityValidationFailedError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly validationResult: ValidationResult
    ) {
        super(`Quality validation failed for asset ${assetId}: ${validationResult.reason}`);
        this.name = 'QualityValidationFailedError';
    }
}
