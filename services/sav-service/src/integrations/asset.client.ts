/**
 * Asset Service Client
 * Client HTTP pour communiquer avec l'Asset Service
 */

export interface AssetResponse {
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

export class AssetServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Asset Service error (${statusCode}): ${details}`);
        this.name = 'AssetServiceError';
    }
}

export interface AssetServiceClient {
    getAsset(assetId: string): Promise<AssetResponse>;
    updateStatus(assetId: string, status: string): Promise<AssetResponse>;
}

export class HttpAssetServiceClient implements AssetServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';
    }

    async getAsset(assetId: string): Promise<AssetResponse> {
        const response = await fetch(`${this.baseUrl}/assets/${assetId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new AssetServiceError(response.status, errorBody);
        }

        return response.json() as Promise<AssetResponse>;
    }

    async updateStatus(assetId: string, status: string): Promise<AssetResponse> {
        const response = await fetch(`${this.baseUrl}/assets/${assetId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new AssetServiceError(response.status, errorBody);
        }

        return response.json() as Promise<AssetResponse>;
    }
}
