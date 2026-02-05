/**
 * HTTP Client with Timeout and Retry
 * Client HTTP avec gestion des timeouts et retries sur appels idempotents
 */

/**
 * Configuration du client HTTP
 */
export interface HttpClientConfig {
    baseUrl: string;
    timeout?: number; // ms, défaut 5000
    retries?: number; // défaut 0 (pas de retry)
    retryDelay?: number; // ms, défaut 1000
}

/**
 * Options de requête
 */
export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    retries?: number; // Override du nombre de retries
    idempotent?: boolean; // Si true, autorise les retries
}

/**
 * Erreur HTTP
 */
export class HttpError extends Error {
    constructor(
        public readonly statusCode: number,
        public readonly statusMessage: string,
        public readonly body?: string
    ) {
        super(`HTTP ${statusCode}: ${statusMessage}`);
        this.name = 'HttpError';
    }
}

/**
 * Erreur de timeout
 */
export class TimeoutError extends Error {
    constructor(public readonly url: string, public readonly timeoutMs: number) {
        super(`Request to ${url} timed out after ${timeoutMs}ms`);
        this.name = 'TimeoutError';
    }
}

/**
 * Attente avec délai
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch avec timeout
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } catch (error) {
        if ((error as Error).name === 'AbortError') {
            throw new TimeoutError(url, timeoutMs);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Client HTTP robuste
 */
export class RobustHttpClient {
    private readonly baseUrl: string;
    private readonly defaultTimeout: number;
    private readonly defaultRetries: number;
    private readonly retryDelay: number;

    constructor(config: HttpClientConfig) {
        this.baseUrl = config.baseUrl;
        this.defaultTimeout = config.timeout ?? 5000;
        this.defaultRetries = config.retries ?? 0;
        this.retryDelay = config.retryDelay ?? 1000;
    }

    /**
     * Effectue une requête HTTP
     */
    async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const method = options.method ?? 'GET';
        const timeout = options.timeout ?? this.defaultTimeout;

        // Retries uniquement sur GET (idempotent par défaut) ou si explicitement marqué
        const canRetry = options.idempotent ?? method === 'GET';
        const maxRetries = canRetry ? (options.retries ?? this.defaultRetries) : 0;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const fetchOptions: RequestInit = {
            method,
            headers
        };

        if (options.body) {
            fetchOptions.body = JSON.stringify(options.body);
        }

        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    await delay(this.retryDelay * attempt); // Backoff exponentiel simple
                }

                const response = await fetchWithTimeout(url, fetchOptions, timeout);

                if (!response.ok) {
                    const body = await response.text();
                    throw new HttpError(response.status, response.statusText, body);
                }

                // Handle empty responses
                const text = await response.text();
                if (!text) {
                    return {} as T;
                }

                return JSON.parse(text) as T;
            } catch (error) {
                lastError = error as Error;

                // Ne pas retry sur les erreurs 4xx (client errors)
                if (error instanceof HttpError && error.statusCode >= 400 && error.statusCode < 500) {
                    throw error;
                }

                // Si plus de retries disponibles ou pas autorisé, throw
                if (attempt >= maxRetries) {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    // Raccourcis
    get<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
        return this.request<T>(path, { ...options, method: 'GET' });
    }

    post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request<T>(path, { ...options, method: 'POST', body });
    }

    put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request<T>(path, { ...options, method: 'PUT', body, idempotent: true });
    }

    patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
        return this.request<T>(path, { ...options, method: 'PATCH', body });
    }

    delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
        return this.request<T>(path, { ...options, method: 'DELETE', idempotent: true });
    }
}
