/**
 * API Client for E2E Tests
 * Client unifié pour appeler tous les services
 */

import { v4 as uuidv4 } from 'uuid';

// Configuration des services
const SERVICES = {
    asset: process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000',
    procurement: process.env.PROCUREMENT_SERVICE_URL ?? 'http://localhost:3001',
    quality: process.env.QUALITY_SERVICE_URL ?? 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003',
    wms: process.env.WMS_SERVICE_URL ?? 'http://localhost:3004',
    cto: process.env.CTO_SERVICE_URL ?? 'http://localhost:3005',
    ecommerce: process.env.ECOMMERCE_BACKEND_URL ?? 'http://localhost:3006',
    sav: process.env.SAV_SERVICE_URL ?? 'http://localhost:3008'
};

/**
 * Client HTTP générique
 */
async function request<T>(
    baseUrl: string,
    path: string,
    options: {
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
    } = {}
): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...(options.body && { body: JSON.stringify(options.body) })
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    return data as T;
}

// ============================================
// ASSET SERVICE
// ============================================

export interface Asset {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    status: string;
    grade?: string;
}

export const assetService = {
    create: (data: { serialNumber: string; assetType: string; brand: string; model: string }) =>
        request<Asset>(SERVICES.asset, '/assets', { method: 'POST', body: data }),

    get: (id: string) =>
        request<Asset>(SERVICES.asset, `/assets/${id}`),

    updateStatus: (id: string, status: string) =>
        request<Asset>(SERVICES.asset, `/assets/${id}/status`, { method: 'PATCH', body: { status } })
};

// ============================================
// QUALITY SERVICE
// ============================================

export interface QualityCheck {
    id: string;
    assetId: string;
    checkType: string;
    status: string;
}

export const qualityService = {
    createCheck: (assetId: string, checkType: string) =>
        request<QualityCheck>(SERVICES.quality, '/quality/checks', { method: 'POST', body: { assetId, checkType } }),

    completeCheck: (checkId: string, passed: boolean, notes?: string) =>
        request<QualityCheck>(SERVICES.quality, `/quality/checks/${checkId}/complete`, {
            method: 'POST',
            body: { passed, notes }
        })
};

// ============================================
// INVENTORY SERVICE
// ============================================

export interface InventoryMovement {
    id: string;
    assetId: string;
    movementType: string;
    toLocation: string;
}

export interface Availability {
    assetId: string;
    available: boolean;
    status: string;
}

export interface Reservation {
    id: string;
    assetId: string;
    orderRef: string;
}

export const inventoryService = {
    moveAsset: (assetId: string, movementType: string, toLocation: string) =>
        request<InventoryMovement>(SERVICES.inventory, `/inventory/assets/${assetId}/move`, {
            method: 'POST',
            body: { movementType, toLocation }
        }),

    checkAvailability: (assetId: string) =>
        request<Availability>(SERVICES.inventory, `/inventory/assets/${assetId}/availability`),

    reserve: (assetId: string, orderRef: string) =>
        request<Reservation>(SERVICES.inventory, `/inventory/assets/${assetId}/reserve`, {
            method: 'POST',
            body: { orderRef }
        })
};

// ============================================
// CTO SERVICE
// ============================================

export interface CtoValidationResult {
    valid: boolean;
    configurationId?: string;
    errors: Array<{ code: string; message: string }>;
    priceSnapshot?: {
        total: number;
        currency: string;
        frozenAt: string;
    };
    leadTimeDays?: number;
}

export const ctoService = {
    validate: (assetId: string, productModel: string, components: Array<{ type: string; reference: string; quantity: number }>) =>
        request<CtoValidationResult>(SERVICES.cto, '/cto/validate', {
            method: 'POST',
            body: { assetId, productModel, components }
        })
};

// ============================================
// ECOMMERCE SERVICE
// ============================================

export interface Order {
    id: string;
    assetId: string;
    ctoConfigurationId: string;
    customerRef: string;
    status: string;
    priceSnapshot: {
        total: number;
        currency: string;
    };
}

export const ecommerceService = {
    createOrder: (assetId: string, ctoConfigurationId: string, customerRef: string) =>
        request<Order>(SERVICES.ecommerce, '/orders', {
            method: 'POST',
            body: { assetId, ctoConfigurationId, customerRef }
        })
};

// ============================================
// WMS SERVICE
// ============================================

export interface PickingOrder {
    id: string;
    assetId: string;
    status: string;
}

export interface Shipment {
    id: string;
    assetId: string;
    carrier: string;
    trackingNumber: string;
}

export const wmsService = {
    createPicking: (assetId: string, orderRef: string) =>
        request<PickingOrder>(SERVICES.wms, '/wms/picking', { method: 'POST', body: { assetId, orderRef } }),

    completePicking: (pickingId: string) =>
        request<PickingOrder>(SERVICES.wms, `/wms/picking/${pickingId}/complete`, { method: 'POST' }),

    createShipment: (assetId: string, carrier: string, trackingNumber: string) =>
        request<Shipment>(SERVICES.wms, '/wms/shipments', {
            method: 'POST',
            body: { assetId, carrier, trackingNumber }
        })
};

// ============================================
// SAV SERVICE
// ============================================

export interface SavTicket {
    id: string;
    assetId: string;
    customerRef: string;
    issue: string;
    status: string;
}

export interface Rma {
    id: string;
    assetId: string;
    ticketId: string;
    status: string;
}

export interface Diagnosis {
    id: string;
    rmaId: string;
    diagnosis: string;
    resolution: string;
}

export const savService = {
    createTicket: (assetId: string, customerRef: string, issue: string) =>
        request<SavTicket>(SERVICES.sav, '/sav/tickets', {
            method: 'POST',
            body: { assetId, customerRef, issue }
        }),

    createRma: (ticketId: string) =>
        request<Rma>(SERVICES.sav, `/sav/tickets/${ticketId}/rma`, { method: 'POST' }),

    receiveRma: (rmaId: string) =>
        request<Rma>(SERVICES.sav, `/sav/rma/${rmaId}/receive`, { method: 'POST' }),

    diagnoseRma: (rmaId: string, diagnosis: string, resolution: string) =>
        request<Diagnosis>(SERVICES.sav, `/sav/rma/${rmaId}/diagnose`, {
            method: 'POST',
            body: { diagnosis, resolution }
        }),

    resolveRma: (rmaId: string) =>
        request<Rma>(SERVICES.sav, `/sav/rma/${rmaId}/resolve`, { method: 'POST' })
};

// ============================================
// HELPERS
// ============================================

export function generateSerialNumber(): string {
    return `E2E-${uuidv4().substring(0, 8).toUpperCase()}`;
}
