/**
 * Quality Service Client
 * Client HTTP pour communiquer avec le Quality Service
 */

export interface QualityCheckResponse {
    id: string;
    assetId: string;
    checkType: string;
    status: string;
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
    initiateQualityCheck(assetId: string, checkType: string): Promise<QualityCheckResponse>;
}

export class HttpQualityServiceClient implements QualityServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.QUALITY_SERVICE_URL ?? 'http://localhost:3002';
    }

    async initiateQualityCheck(
        assetId: string,
        checkType: string
    ): Promise<QualityCheckResponse> {
        const response = await fetch(`${this.baseUrl}/quality/checks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId, checkType })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new QualityServiceError(response.status, errorBody);
        }

        return response.json() as Promise<QualityCheckResponse>;
    }
}
