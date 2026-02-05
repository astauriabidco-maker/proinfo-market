/**
 * Inventory Service Client
 * Client HTTP pour communiquer avec l'Inventory Service
 */

/**
 * Réponse réservation de l'Inventory Service
 */
export interface ReservationResponse {
    id: string;
    assetId: string;
    orderRef: string;
    createdAt: string;
}

/**
 * Réponse mouvement de l'Inventory Service
 */
export interface MovementResponse {
    id: string;
    assetId: string;
    fromLocation: string | null;
    toLocation: string | null;
    reason: string;
    createdAt: string;
}

/**
 * Erreur lors de l'appel à l'Inventory Service
 */
export class InventoryServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Inventory Service error (${statusCode}): ${details}`);
        this.name = 'InventoryServiceError';
    }
}

/**
 * Interface pour le client Inventory Service (injectable pour tests)
 */
export interface InventoryServiceClient {
    getReservation(assetId: string): Promise<ReservationResponse | null>;
    moveAsset(assetId: string, toLocation: string, reason: string): Promise<MovementResponse>;
}

/**
 * Client HTTP par défaut pour Inventory Service
 */
export class HttpInventoryServiceClient implements InventoryServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003';
    }

    /**
     * Récupère la réservation d'un asset
     */
    async getReservation(assetId: string): Promise<ReservationResponse | null> {
        const response = await fetch(`${this.baseUrl}/inventory/assets/${assetId}/reservation`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new InventoryServiceError(response.status, errorBody);
        }

        return response.json() as Promise<ReservationResponse>;
    }

    /**
     * Déplace un asset
     */
    async moveAsset(
        assetId: string,
        toLocation: string,
        reason: string
    ): Promise<MovementResponse> {
        const response = await fetch(`${this.baseUrl}/inventory/assets/${assetId}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toLocation, reason })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new InventoryServiceError(response.status, errorBody);
        }

        return response.json() as Promise<MovementResponse>;
    }
}
