/**
 * Diagnosis Types
 * Types pour les diagnostics RMA
 */

import { ResolutionType } from '@prisma/client';

/**
 * DTO pour créer un diagnostic
 */
export interface CreateDiagnosisDto {
    diagnosis: string;
    resolution: ResolutionType;
}

/**
 * Entité Diagnostic RMA
 */
export interface DiagnosisEntity {
    id: string;
    rmaId: string;
    diagnosis: string;
    resolution: ResolutionType;
    createdAt: Date;
}

/**
 * Erreur : Diagnostic non trouvé
 */
export class DiagnosisNotFoundError extends Error {
    constructor(public readonly rmaId: string) {
        super(`No diagnosis found for RMA ${rmaId}`);
        this.name = 'DiagnosisNotFoundError';
    }
}

/**
 * Erreur : RMA pas reçu pour diagnostic
 */
export class RmaNotReceivedError extends Error {
    constructor(public readonly rmaId: string) {
        super(`RMA ${rmaId} must be received before diagnosis`);
        this.name = 'RmaNotReceivedError';
    }
}

/**
 * Erreur : RMA pas diagnostiqué pour résolution
 */
export class RmaNotDiagnosedError extends Error {
    constructor(public readonly rmaId: string) {
        super(`RMA ${rmaId} must be diagnosed before resolution`);
        this.name = 'RmaNotDiagnosedError';
    }
}
