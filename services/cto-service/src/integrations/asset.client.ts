/**
 * Asset Service Client
 * Client HTTP pour communiquer avec l'Asset Service
 */

/**
 * Réponse de l'Asset Service
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
 * Erreur lors de l'appel à l'Asset Service
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
 * Interface pour le client Asset Service (injectable pour tests)
 */
export interface AssetServiceClient {
    getAsset(assetId: string): Promise<AssetServiceResponse>;
}

/**
 * Client HTTP par défaut pour Asset Service
 */
export class HttpAssetServiceClient implements AssetServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';
    }

    /**
     * Récupère un asset par ID
     */
    async getAsset(assetId: string): Promise<AssetServiceResponse> {
        const response = await fetch(`${this.baseUrl}/assets/${assetId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new AssetServiceError(response.status, errorBody);
        }

        return response.json() as Promise<AssetServiceResponse>;
    }
}
