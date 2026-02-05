/**
 * Inventory Service Client
 * Client HTTP pour communiquer avec l'Inventory Service
 */

export interface AvailabilityResponse {
    assetId: string;
    available: boolean;
    status: string;
    location?: string;
    reserved: boolean;
}

export interface ReservationResponse {
    id: string;
    assetId: string;
    orderRef: string;
    createdAt: string;
}

export class InventoryServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Inventory Service error (${statusCode}): ${details}`);
        this.name = 'InventoryServiceError';
    }
}

export interface InventoryServiceClient {
    checkAvailability(assetId: string): Promise<AvailabilityResponse>;
    reserveAsset(assetId: string, orderRef: string): Promise<ReservationResponse>;
}

export class HttpInventoryServiceClient implements InventoryServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003';
    }

    async checkAvailability(assetId: string): Promise<AvailabilityResponse> {
        const response = await fetch(`${this.baseUrl}/inventory/assets/${assetId}/availability`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new InventoryServiceError(response.status, errorBody);
        }

        return response.json() as Promise<AvailabilityResponse>;
    }

    async reserveAsset(assetId: string, orderRef: string): Promise<ReservationResponse> {
        const response = await fetch(`${this.baseUrl}/inventory/assets/${assetId}/reserve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderRef })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new InventoryServiceError(response.status, errorBody);
        }

        return response.json() as Promise<ReservationResponse>;
    }
}
