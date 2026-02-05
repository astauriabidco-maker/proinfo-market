/**
 * Procurement Domain Types
 * Types centraux pour le domaine Procurement
 */

import { SupplierType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * DTO pour la création d'un lot d'achat
 */
export interface CreateProcurementLotDto {
    supplierName: string;
    supplierType: SupplierType;
    purchaseDate: string; // ISO date string
    totalUnitsDeclared: number;
    totalPurchasePrice: number;
}

/**
 * DTO pour l'intake d'une machine
 */
export interface IntakeAssetDto {
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    chassisRef?: string;
    unitCost: number;
}

/**
 * Représentation d'un lot d'achat
 */
export interface ProcurementLotEntity {
    id: string;
    supplierName: string;
    supplierType: SupplierType;
    purchaseDate: Date;
    totalUnitsDeclared: number;
    totalPurchasePrice: Decimal;
    createdAt: Date;
    itemCount?: number;
}

/**
 * Représentation d'un item de lot
 */
export interface ProcurementLotItemEntity {
    id: string;
    lotId: string;
    assetId: string;
    unitCost: Decimal;
    createdAt: Date;
}

/**
 * Réponse de l'Asset Service lors de la création
 */
export interface AssetServiceResponse {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    chassisRef: string | null;
    status: string;
    grade: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Erreur : Lot non trouvé
 */
export class ProcurementLotNotFoundError extends Error {
    constructor(public readonly lotId: string) {
        super(`Procurement lot with id ${lotId} not found`);
        this.name = 'ProcurementLotNotFoundError';
    }
}

/**
 * Erreur : Quota dépassé
 */
export class IntakeQuotaExceededError extends Error {
    constructor(
        public readonly lotId: string,
        public readonly declared: number,
        public readonly current: number
    ) {
        super(`Intake quota exceeded for lot ${lotId}: declared ${declared}, current ${current}`);
        this.name = 'IntakeQuotaExceededError';
    }
}

/**
 * Erreur : Asset Service a échoué
 */
export class AssetServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Asset Service error (${statusCode}): ${details}`);
        this.name = 'AssetServiceError';
    }
}

/**
 * Erreur : Validation
 */
export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
