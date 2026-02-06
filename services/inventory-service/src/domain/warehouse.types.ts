/**
 * Warehouse Types
 * Types pour la gestion multi-entrepôts
 */

import { StockStatus } from '@prisma/client';

// Re-export Prisma types
export { StockStatus };

// ============================================
// CONSTANTS
// ============================================

/**
 * Points de priorité pour le routage
 */
export const ROUTING_PRIORITY = {
    SAME_COUNTRY: 10,
    FULL_STOCK: 5,
    SHORT_DELAY: 1
} as const;

/**
 * Délais estimés par pays (jours ouvrés)
 */
export const DELIVERY_DELAYS: Record<string, number> = {
    FR: 2,
    BE: 3,
    DE: 3,
    ES: 4,
    IT: 4,
    DEFAULT: 5
};

// ============================================
// WAREHOUSE TYPES
// ============================================

export interface WarehouseEntity {
    id: string;
    code: string;
    name: string;
    country: string;
    active: boolean;
    createdAt: Date;
}

export interface CreateWarehouseDto {
    code: string;
    name: string;
    country: string;
}

// ============================================
// STOCK LOCATION TYPES
// ============================================

export interface StockLocationEntity {
    id: string;
    assetId: string;
    warehouseId: string;
    status: StockStatus;
    orderId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// ROUTING TYPES
// ============================================

export interface RoutingRequest {
    orderId: string;
    customerCountry: string;
    assetIds: string[];
}

export interface WarehouseScore {
    warehouseId: string;
    warehouseCode: string;
    country: string;
    score: number;
    availableAssets: number;
    estimatedDelay: number;
    reasons: string[];
}

export interface RoutingResult {
    orderId: string;
    assignedWarehouseId: string;
    assignedWarehouseCode: string;
    estimatedDelay: number;
    assetsReserved: string[];
    calculatedAt: Date;
}

export interface RoutingFailure {
    orderId: string;
    reason: string;
    assetsMissing: string[];
}

// ============================================
// EVENTS
// ============================================

export function emitWarehouseAssigned(orderId: string, warehouseCode: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'WarehouseAssigned',
        orderId,
        warehouseCode,
        timestamp: new Date().toISOString()
    }));
}

export function emitAssetReservedAtWarehouse(assetId: string, warehouseCode: string, orderId: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'AssetReservedAtWarehouse',
        assetId,
        warehouseCode,
        orderId,
        timestamp: new Date().toISOString()
    }));
}

export function emitRoutingFailed(orderId: string, reason: string): void {
    console.log('[EVENT]', JSON.stringify({
        type: 'RoutingFailed',
        orderId,
        reason,
        timestamp: new Date().toISOString()
    }));
}

// ============================================
// ERRORS
// ============================================

export class NoWarehouseAvailableError extends Error {
    constructor(orderId: string, reason: string) {
        super(`No warehouse available for order ${orderId}: ${reason}`);
        this.name = 'NoWarehouseAvailableError';
    }
}

export class RoutingAlreadyAssignedError extends Error {
    constructor(orderId: string) {
        super(`Order ${orderId} already has a warehouse assigned`);
        this.name = 'RoutingAlreadyAssignedError';
    }
}

export class WmsAlreadyStartedError extends Error {
    constructor(orderId: string) {
        super(`Cannot reassign warehouse for order ${orderId} - WMS already started`);
        this.name = 'WmsAlreadyStartedError';
    }
}
