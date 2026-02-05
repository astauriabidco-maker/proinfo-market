/**
 * Order Service Client
 * Client HTTP pour lire les commandes (lecture seule)
 */

export interface OrderResponse {
    id: string;
    assetId: string;
    customerRef: string;
    status: string;
    priceSnapshot?: {
        total: number;
        currency: string;
    };
    createdAt: string;
}

export class OrderServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly details: string
    ) {
        super(`Order Service error (${statusCode}): ${details}`);
        this.name = 'OrderServiceError';
    }
}

export interface OrderServiceClient {
    getOrdersByCustomer(customerRef: string): Promise<OrderResponse[]>;
    getOrdersByAsset(assetId: string): Promise<OrderResponse[]>;
}

export class HttpOrderServiceClient implements OrderServiceClient {
    private readonly baseUrl: string;
    private readonly timeout: number;

    constructor(baseUrl?: string, timeout = 5000) {
        this.baseUrl = baseUrl ?? process.env.ECOMMERCE_SERVICE_URL ?? 'http://localhost:3006';
        this.timeout = timeout;
    }

    async getOrdersByCustomer(customerRef: string): Promise<OrderResponse[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${this.baseUrl}/orders?customerRef=${encodeURIComponent(customerRef)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new OrderServiceError(response.status, errorBody);
            }

            return response.json() as Promise<OrderResponse[]>;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async getOrdersByAsset(assetId: string): Promise<OrderResponse[]> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(
                `${this.baseUrl}/orders?assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();
                throw new OrderServiceError(response.status, errorBody);
            }

            return response.json() as Promise<OrderResponse[]>;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
