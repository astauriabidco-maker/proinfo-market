/**
 * Asset Service Client
 * Client HTTP pour lire les données Asset (lecture seule)
 */

export interface AssetResponse {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    status: string;
    grade?: string;
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
}

export class HttpAssetServiceClient implements AssetServiceClient {
    private readonly baseUrl: string;
    private readonly timeout: number;

    constructor(baseUrl?: string, timeout = 5000) {
        this.baseUrl = baseUrl ?? process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000';
        this.timeout = timeout;
    }

    async getAsset(assetId: string): Promise<AssetResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/assets/${assetId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new AssetServiceError(response.status, errorBody);
            }

            return response.json() as Promise<AssetResponse>;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
