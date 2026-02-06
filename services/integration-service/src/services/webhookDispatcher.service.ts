/**
 * Webhook Dispatcher Service
 * Dispatch des webhooks avec signature HMAC
 * 
 * RÈGLES :
 * - Signature HMAC SHA256 obligatoire
 * - Retry avec traçabilité COMPLÈTE
 * - Chaque tentative loggée en base
 * - Pas de reprise sans audit trail
 */

import { PrismaClient } from '@prisma/client';
import { createHmac, createHash } from 'crypto';
import {
    WebhookEvent,
    WebhookPayload,
    WebhookDispatchResult,
    DEFAULT_WEBHOOK_CONFIG
} from '../domain/webhook.types';

export class WebhookDispatcherService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Dispatcher un événement à tous les abonnés
     * TRAÇABILITÉ : Chaque dispatch et retry est loggé
     */
    async dispatch<T>(
        companyId: string,
        event: WebhookEvent,
        data: T
    ): Promise<WebhookDispatchResult[]> {
        console.log(`[WEBHOOK] Dispatching ${event} for company ${companyId}`);

        // Récupérer les abonnements actifs
        const subscriptions = await this.prisma.webhookSubscription.findMany({
            where: {
                companyId,
                event,
                active: true
            }
        });

        if (subscriptions.length === 0) {
            console.log(`[WEBHOOK] No active subscriptions for ${event}`);
            return [];
        }

        const payload: WebhookPayload<T> = {
            event,
            timestamp: new Date().toISOString(),
            data
        };

        const payloadStr = JSON.stringify(payload);
        const payloadHash = this.hashPayload(payloadStr);

        const results: WebhookDispatchResult[] = [];

        for (const sub of subscriptions) {
            const result = await this.sendWebhookWithTraceability(
                sub.id,
                companyId,
                event,
                sub.targetUrl,
                sub.secret,
                payloadStr,
                payloadHash
            );
            results.push(result);

            // Incrémenter le compteur d'échecs si nécessaire
            if (!result.success) {
                await this.prisma.webhookSubscription.update({
                    where: { id: sub.id },
                    data: { failCount: { increment: 1 } }
                });
            } else {
                // Reset fail count on success
                await this.prisma.webhookSubscription.update({
                    where: { id: sub.id },
                    data: { failCount: 0 }
                });
            }
        }

        return results;
    }

    /**
     * Envoyer un webhook avec traçabilité COMPLÈTE
     * Chaque tentative est loggée en base
     */
    private async sendWebhookWithTraceability(
        subscriptionId: string,
        companyId: string,
        event: string,
        targetUrl: string,
        secret: string,
        payloadStr: string,
        payloadHash: string
    ): Promise<WebhookDispatchResult> {
        const signature = this.signPayload(payloadStr, secret);

        let attempt = 0;
        let lastError: string | undefined;
        let lastStatusCode: number | undefined;

        while (attempt < DEFAULT_WEBHOOK_CONFIG.maxRetries) {
            attempt++;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(
                    () => controller.abort(),
                    DEFAULT_WEBHOOK_CONFIG.timeoutMs
                );

                const response = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Signature': `sha256=${signature}`,
                        'X-Webhook-Event': event,
                        'X-Webhook-Timestamp': new Date().toISOString()
                    },
                    body: payloadStr,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                lastStatusCode = response.status;

                // LOG TRAÇABILITÉ : Chaque tentative
                await this.logDispatch({
                    subscriptionId,
                    companyId,
                    event,
                    targetUrl,
                    attempt,
                    success: response.ok,
                    statusCode: response.status,
                    errorMessage: response.ok ? null : `HTTP ${response.status}`,
                    payloadHash
                });

                if (response.ok) {
                    console.log(`[WEBHOOK] Delivered to ${targetUrl} (attempt ${attempt})`);
                    return {
                        subscriptionId,
                        targetUrl,
                        success: true,
                        statusCode: response.status,
                        dispatchedAt: new Date()
                    };
                }

                lastError = `HTTP ${response.status}`;
            } catch (err) {
                lastError = err instanceof Error ? err.message : 'Unknown error';

                // LOG TRAÇABILITÉ : Échec avec erreur
                await this.logDispatch({
                    subscriptionId,
                    companyId,
                    event,
                    targetUrl,
                    attempt,
                    success: false,
                    statusCode: null,
                    errorMessage: lastError,
                    payloadHash
                });
            }

            // Wait before retry (loggé pour traçabilité)
            if (attempt < DEFAULT_WEBHOOK_CONFIG.maxRetries) {
                console.log(`[WEBHOOK] Retry ${attempt + 1}/${DEFAULT_WEBHOOK_CONFIG.maxRetries} for ${targetUrl}`);
                await this.delay(DEFAULT_WEBHOOK_CONFIG.retryDelayMs);
            }
        }

        console.error(`[WEBHOOK] Failed to deliver to ${targetUrl} after ${attempt} attempts: ${lastError}`);
        return {
            subscriptionId,
            targetUrl,
            success: false,
            statusCode: lastStatusCode,
            error: lastError,
            dispatchedAt: new Date()
        };
    }

    /**
     * Logger un dispatch webhook (traçabilité)
     */
    private async logDispatch(data: {
        subscriptionId: string;
        companyId: string;
        event: string;
        targetUrl: string;
        attempt: number;
        success: boolean;
        statusCode: number | null;
        errorMessage: string | null;
        payloadHash: string;
    }): Promise<void> {
        try {
            await this.prisma.webhookDispatchLog.create({
                data: {
                    subscriptionId: data.subscriptionId,
                    companyId: data.companyId,
                    event: data.event,
                    targetUrl: data.targetUrl,
                    attempt: data.attempt,
                    success: data.success,
                    statusCode: data.statusCode,
                    errorMessage: data.errorMessage,
                    payloadHash: data.payloadHash
                }
            });
        } catch (err) {
            // Log error but don't fail the dispatch
            console.error('[WEBHOOK] Failed to log dispatch:', err);
        }
    }

    /**
     * Créer un abonnement webhook
     */
    async subscribe(
        companyId: string,
        event: WebhookEvent,
        targetUrl: string
    ): Promise<{ id: string; secret: string }> {
        const secret = this.generateSecret();

        const subscription = await this.prisma.webhookSubscription.create({
            data: {
                companyId,
                event,
                targetUrl,
                secret,
                active: true
            }
        });

        console.log(`[WEBHOOK] Subscription created: ${event} → ${targetUrl}`);

        return { id: subscription.id, secret };
    }

    /**
     * Signer le payload avec HMAC SHA256
     */
    signPayload(payload: string, secret: string): string {
        return createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    /**
     * Hash du payload pour audit
     */
    hashPayload(payload: string): string {
        return createHash('sha256')
            .update(payload)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Vérifier une signature (pour tests)
     */
    verifySignature(payload: string, signature: string, secret: string): boolean {
        const expected = this.signPayload(payload, secret);
        return signature === `sha256=${expected}`;
    }

    // ============================================
    // HELPERS
    // ============================================

    private generateSecret(): string {
        return createHmac('sha256', Date.now().toString())
            .update(Math.random().toString())
            .digest('hex');
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
