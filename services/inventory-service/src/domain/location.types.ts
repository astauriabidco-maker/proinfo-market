/**
 * Location Types
 * Types pour les entrepôts et emplacements
 */

import { LocationType } from '@prisma/client';

/**
 * DTO pour créer un entrepôt
 */
export interface CreateWarehouseDto {
    name: string;
    code?: string;
    country?: string;
}

/**
 * DTO pour créer un emplacement
 */
export interface CreateLocationDto {
    code: string;
    type: LocationType;
}

/**
 * Entité Entrepôt
 */
export interface WarehouseEntity {
    id: string;
    code?: string;
    name: string;
    country?: string;
    active?: boolean;
    createdAt: Date;
    locations?: LocationEntity[];
}

/**
 * Entité Emplacement
 */
export interface LocationEntity {
    id: string;
    warehouseId: string;
    code: string;
    type: LocationType;
    createdAt: Date;
}

/**
 * Erreur : Entrepôt non trouvé
 */
export class WarehouseNotFoundError extends Error {
    constructor(public readonly warehouseId: string) {
        super(`Warehouse ${warehouseId} not found`);
        this.name = 'WarehouseNotFoundError';
    }
}

/**
 * Erreur : Emplacement non trouvé
 */
export class LocationNotFoundError extends Error {
    constructor(public readonly locationId: string) {
        super(`Location ${locationId} not found`);
        this.name = 'LocationNotFoundError';
    }
}

/**
 * Erreur : Emplacement déjà existant
 */
export class DuplicateLocationError extends Error {
    constructor(
        public readonly warehouseId: string,
        public readonly code: string
    ) {
        super(`Location ${code} already exists in warehouse ${warehouseId}`);
        this.name = 'DuplicateLocationError';
    }
}

/**
 * Labels français pour LocationType
 */
export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
    RECEIVING: 'Réception',
    STORAGE: 'Stockage',
    ASSEMBLY: 'Assemblage',
    SHIPPING: 'Expédition'
};
