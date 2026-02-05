/**
 * Inventory Service Client
 * Client HTTP pour communiquer avec l'Inventory Service
 */

export interface MovementResponse {
    id: string;
    assetId: string;
    movementType: string;
    fromLocation: string | null;
    toLocation: string;
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
    moveAsset(assetId: string, movementType: string, toLocation: string): Promise<MovementResponse>;
}

export class HttpInventoryServiceClient implements InventoryServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003';
    }

    async moveAsset(
        assetId: string,
        movementType: string,
        toLocation: string
    ): Promise<MovementResponse> {
        const response = await fetch(`${this.baseUrl}/inventory/assets/${assetId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movementType, toLocation })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new InventoryServiceError(response.status, errorBody);
        }

        return response.json() as Promise<MovementResponse>;
    }
}
