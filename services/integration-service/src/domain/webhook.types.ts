/**
 * Webhook Types
 * Types pour les webhooks sortants
 * 
 * RÈGLE : Signature HMAC obligatoire, retry simple
 */

/**
 * Événements webhook disponibles
 */
export type WebhookEvent =
    | 'ASSET_SHIPPED'
    | 'RMA_CREATED'
    | 'RMA_RESOLVED'
    | 'INVOICE_ISSUED';

/**
 * Descriptions des événements
 */
export const EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
    ASSET_SHIPPED: 'Asset expédié au client',
    RMA_CREATED: 'Nouveau RMA créé',
    RMA_RESOLVED: 'RMA résolu',
    INVOICE_ISSUED: 'Facture émise'
};

/**
 * Payload webhook générique
 */
export interface WebhookPayload<T = unknown> {
    event: WebhookEvent;
    timestamp: string;
    data: T;
}

/**
 * Payload ASSET_SHIPPED
 */
export interface AssetShippedPayload {
    assetId: string;
    serialNumber: string;
    trackingNumber: string;
    carrier: string;
    shippedAt: string;
}

/**
 * Payload RMA_CREATED
 */
export interface RmaCreatedPayload {
    rmaId: string;
    assetId: string;
    ticketRef: string;
    reason: string;
    createdAt: string;
}

/**
 * Payload RMA_RESOLVED
 */
export interface RmaResolvedPayload {
    rmaId: string;
    assetId: string;
    resolution: 'REPAIRED' | 'REPLACED' | 'REFUNDED';
    resolvedAt: string;
}

/**
 * Payload INVOICE_ISSUED
 */
export interface InvoiceIssuedPayload {
    invoiceId: string;
    orderId: string;
    amount: number;
    currency: string;
    issuedAt: string;
}

/**
 * Résultat de dispatch webhook
 */
export interface WebhookDispatchResult {
    subscriptionId: string;
    targetUrl: string;
    success: boolean;
    statusCode?: number;
    error?: string;
    dispatchedAt: Date;
}

/**
 * Configuration webhook
 */
export interface WebhookConfig {
    maxRetries: number;
    retryDelayMs: number;
    timeoutMs: number;
}

export const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
    maxRetries: 3,
    retryDelayMs: 5000,
    timeoutMs: 10000
};

/**
 * Création d'abonnement webhook
 */
export interface CreateWebhookDto {
    event: WebhookEvent;
    targetUrl: string;
}
