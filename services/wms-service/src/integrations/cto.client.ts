/**
 * CTO Service Client
 * Intégration avec le CTO Service pour validation des configurations
 */

export interface CtoConfiguration {
    id: string;
    assetId: string;
    priceSnapshot: {
        base: number;
        options: number;
        total: number;
    };
    components: Array<{
        componentId: string;
        quantity: number;
    }>;
    validated: boolean;
}

export interface CtoServiceClient {
    getConfiguration(configId: string): Promise<CtoConfiguration | null>;
    getConfigurationByAssetId(assetId: string): Promise<CtoConfiguration | null>;
}

/**
 * Client HTTP vers CTO Service
 */
export class HttpCtoServiceClient implements CtoServiceClient {
    private readonly baseUrl: string;

    constructor() {
        this.baseUrl = process.env.CTO_SERVICE_URL ?? 'http://localhost:3005';
    }

    async getConfiguration(configId: string): Promise<CtoConfiguration | null> {
        try {
            const response = await fetch(`${this.baseUrl}/cto/configurations/${configId}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`CTO Service error: ${response.status}`);
            }
            return response.json() as Promise<CtoConfiguration>;
        } catch (error) {
            console.error('[CTO_CLIENT]', error);
            throw error;
        }
    }

    async getConfigurationByAssetId(assetId: string): Promise<CtoConfiguration | null> {
        try {
            const response = await fetch(`${this.baseUrl}/cto/configurations/asset/${assetId}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`CTO Service error: ${response.status}`);
            }
            return response.json() as Promise<CtoConfiguration>;
        } catch (error) {
            console.error('[CTO_CLIENT]', error);
            throw error;
        }
    }
}
