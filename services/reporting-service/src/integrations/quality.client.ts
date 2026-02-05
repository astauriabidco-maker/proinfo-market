/**
 * Quality Service Client
 * Client HTTP pour lire les données Qualité (lecture seule)
 */

export interface QualityCheckResponse {
    id: string;
    assetId: string;
    checkType: string;
    status: string;
    passed?: boolean;
    createdAt: string;
}

export class QualityServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Quality Service error (${statusCode}): ${details}`);
        this.name = 'QualityServiceError';
    }
}

export interface QualityServiceClient {
    getChecksByAsset(assetId: string): Promise<QualityCheckResponse[]>;
}

export class HttpQualityServiceClient implements QualityServiceClient {
    private readonly baseUrl: string;
    private readonly timeout: number;

    constructor(baseUrl?: string, timeout = 5000) {
        this.baseUrl = baseUrl ?? process.env.QUALITY_SERVICE_URL ?? 'http://localhost:3002';
        this.timeout = timeout;
    }

    async getChecksByAsset(assetId: string): Promise<QualityCheckResponse[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${this.baseUrl}/quality/assets/${assetId}/checks`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new QualityServiceError(response.status, errorBody);
            }

            return response.json() as Promise<QualityCheckResponse[]>;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
