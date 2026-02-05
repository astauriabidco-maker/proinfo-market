/**
 * CTO Service Client
 * Client HTTP pour communiquer avec le CTO Engine
 */

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

export interface AssemblyOrder {
    assetId: string;
    tasks: string[];
}

export interface CtoValidationResult {
    valid: boolean;
    configurationId?: string;
    errors: CtoValidationError[];
    priceSnapshot?: PriceSnapshot;
    leadTimeDays?: number;
    assemblyOrder?: AssemblyOrder;
}

export interface CtoValidationError {
    code: string;
    message: string;
    component?: string;
    rule?: string;
}

export interface CtoConfigurationResponse {
    id: string;
    assetId: string;
    configuration: CtoComponent[];
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    ruleSetId: string;
    validated: boolean;
    createdAt: string;
    assemblyOrder?: AssemblyOrder;
}

export class CtoServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`CTO Service error (${statusCode}): ${details}`);
        this.name = 'CtoServiceError';
    }
}

export interface CtoServiceClient {
    validateConfiguration(
        assetId: string,
        productModel: string,
        components: CtoComponent[]
    ): Promise<CtoValidationResult>;
    getConfiguration(configurationId: string): Promise<CtoConfigurationResponse>;
}

export class HttpCtoServiceClient implements CtoServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl ?? process.env.CTO_SERVICE_URL ?? 'http://localhost:3005';
    }

    async validateConfiguration(
        assetId: string,
        productModel: string,
        components: CtoComponent[]
    ): Promise<CtoValidationResult> {
        const response = await fetch(`${this.baseUrl}/cto/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId, productModel, components })
        });

        // Le CTO peut retourner 422 pour une configuration invalide
        const result = await response.json() as CtoValidationResult;
        return result;
    }

    async getConfiguration(configurationId: string): Promise<CtoConfigurationResponse> {
        const response = await fetch(`${this.baseUrl}/cto/configurations/${configurationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new CtoServiceError(response.status, errorBody);
        }

        return response.json() as Promise<CtoConfigurationResponse>;
    }
}
