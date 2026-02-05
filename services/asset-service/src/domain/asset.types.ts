/**
 * Asset Domain Types
 * Types centraux pour le domaine Asset
 */

import { AssetType, AssetStatus, AssetGrade } from '@prisma/client';

/**
 * DTO pour la création d'un Asset
 */
export interface CreateAssetDto {
    serialNumber: string;
    assetType: AssetType;
    brand: string;
    model: string;
    chassisRef?: string;
}

/**
 * DTO pour le changement de statut
 */
export interface ChangeStatusDto {
    newStatus: AssetStatus;
    reason?: string;
}

/**
 * Représentation complète d'un Asset
 */
export interface AssetEntity {
    id: string;
    serialNumber: string;
    assetType: AssetType;
    brand: string;
    model: string;
    chassisRef: string | null;
    status: AssetStatus;
    grade: AssetGrade | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Entrée d'historique d'état
 */
export interface AssetStateHistoryEntry {
    id: string;
    assetId: string;
    previousStatus: AssetStatus | null;
    newStatus: AssetStatus;
    reason: string | null;
    createdAt: Date;
}

/**
 * Erreur métier pour les transitions invalides
 */
export class InvalidTransitionError extends Error {
    constructor(
        public readonly currentStatus: AssetStatus,
        public readonly targetStatus: AssetStatus
    ) {
        super(`Invalid transition from ${currentStatus} to ${targetStatus}`);
        this.name = 'InvalidTransitionError';
    }
}

/**
 * Erreur métier pour les doublons de numéro de série
 */
export class DuplicateSerialNumberError extends Error {
    constructor(public readonly serialNumber: string) {
        super(`Asset with serial number ${serialNumber} already exists`);
        this.name = 'DuplicateSerialNumberError';
    }
}

/**
 * Erreur métier pour Asset non trouvé
 */
export class AssetNotFoundError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset with id ${assetId} not found`);
        this.name = 'AssetNotFoundError';
    }
}
