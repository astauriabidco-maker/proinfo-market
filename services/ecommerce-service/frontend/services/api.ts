/**
 * API Service
 * Client API pour le frontend
 * 
 * Le frontend ne valide RIEN, il affiche les données des services.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3006';
const ASSET_SERVICE_URL = process.env.NEXT_PUBLIC_ASSET_SERVICE_URL || 'http://localhost:3000';
const INVENTORY_SERVICE_URL = process.env.NEXT_PUBLIC_INVENTORY_SERVICE_URL || 'http://localhost:3003';
const CTO_SERVICE_URL = process.env.NEXT_PUBLIC_CTO_SERVICE_URL || 'http://localhost:3005';

// Types
export interface Asset {
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

export interface Availability {
    assetId: string;
    available: boolean;
    status: string;
    location?: string;
    reserved: boolean;
}

export interface CtoComponent {
    type: string;
    reference: string;
    quantity: number;
}

export interface PriceSnapshot {
    components: ComponentPrice[];
    laborCost: number;
    subtotal: number;
    margin: number;
    total: number;
    currency: string;
    frozenAt: string;
}

export interface ComponentPrice {
    type: string;
    reference: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface CtoValidationResult {
    valid: boolean;
    configurationId?: string;
    errors: { code: string; message: string }[];
    priceSnapshot?: PriceSnapshot;
    leadTimeDays?: number;
    assemblyOrder?: { assetId: string; tasks: string[] };
}

export interface Order {
    id: string;
    assetId: string;
    ctoConfigurationId: string;
    customerRef: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    status: string;
    reservationId?: string;
    createdAt: string;
}

// API Functions

/**
 * Récupère les Assets vendables
 */
export async function getSellableAssets(): Promise<Asset[]> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets?status=SELLABLE`);
    if (!response.ok) {
        throw new Error('Failed to fetch assets');
    }
    return response.json();
}

/**
 * Récupère un Asset par ID
 */
export async function getAsset(assetId: string): Promise<Asset> {
    const response = await fetch(`${ASSET_SERVICE_URL}/assets/${assetId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch asset');
    }
    return response.json();
}

/**
 * Vérifie la disponibilité d'un Asset
 */
export async function checkAvailability(assetId: string): Promise<Availability> {
    const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/assets/${assetId}/availability`);
    if (!response.ok) {
        throw new Error('Failed to check availability');
    }
    return response.json();
}

/**
 * Valide une configuration CTO
 */
export async function validateCtoConfiguration(
    assetId: string,
    productModel: string,
    components: CtoComponent[]
): Promise<CtoValidationResult> {
    const response = await fetch(`${CTO_SERVICE_URL}/cto/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, productModel, components })
    });
    return response.json();
}

/**
 * Crée une commande
 */
export async function createOrder(
    assetId: string,
    ctoConfigurationId: string,
    customerRef: string
): Promise<Order> {
    const response = await fetch(`${BACKEND_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, ctoConfigurationId, customerRef })
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
    }
    return response.json();
}
