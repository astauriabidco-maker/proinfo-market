/**
 * Contract Types
 * Types pour les contrats pluriannuels
 * 
 * RÈGLE : ARR déclaré explicitement, pas de recalcul auto
 */

/**
 * Statut d'un contrat
 */
export type ContractStatus = 'ACTIVE' | 'TERMINATED' | 'EXPIRED';

/**
 * Contrat entity
 */
export interface ContractEntity {
    id: string;
    companyId: string;
    companyName: string;
    startDate: Date;
    endDate: Date;
    arrAmount: number;  // Decimal en base, number ici
    status: ContractStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * DTO création contrat
 */
export interface CreateContractDto {
    companyId: string;
    companyName: string;
    startDate: string;  // ISO date
    endDate: string;    // ISO date
    arrAmount: number;
    notes?: string;
    assetIds: string[];  // Assets à couvrir
}

/**
 * Asset couvert par un contrat
 */
export interface ContractAssetEntity {
    id: string;
    contractId: string;
    assetId: string;
    serialNumber: string | null;
    assetType: string | null;
    addedAt: Date;
}

/**
 * Contrat avec assets
 */
export interface ContractWithAssets extends ContractEntity {
    assets: ContractAssetEntity[];
    daysRemaining: number;
}

/**
 * Vue client (lecture seule)
 */
export interface ClientContractView {
    id: string;
    companyName: string;
    startDate: string;
    endDate: string;
    status: ContractStatus;
    assetsCount: number;
    daysRemaining: number;
    // ❌ Pas d'ARR exposé au client
}

// ============================================
// ERRORS
// ============================================

export class ContractNotFoundError extends Error {
    constructor(id: string) {
        super(`Contract not found: ${id}`);
        this.name = 'ContractNotFoundError';
    }
}

export class ContractValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ContractValidationError';
    }
}
