/**
 * Quote Model
 * Modèle pour les devis CTO B2B
 * 
 * RÈGLE : Le priceSnapshot est FIGÉ, jamais recalculé
 */

import { v4 as uuidv4 } from 'uuid';
import { PriceSnapshot } from '../integrations/cto.client';

/**
 * Statut d'un devis
 */
export enum QuoteStatus {
    ACTIVE = 'ACTIVE',      // Devis valide, peut être converti
    EXPIRED = 'EXPIRED',    // Devis expiré (> 30 jours)
    CONVERTED = 'CONVERTED' // Converti en commande
}

/**
 * Devis CTO
 */
export interface Quote {
    id: string;
    companyId: string;
    customerRef: string;
    assetId: string;
    ctoConfigurationId: string;
    priceSnapshot: PriceSnapshot;   // FIGÉ depuis CTO
    leadTimeDays: number;
    status: QuoteStatus;
    createdAt: Date;
    expiresAt: Date;
    convertedOrderId?: string;
}

/**
 * DTO pour créer un devis
 */
export interface CreateQuoteDto {
    assetId: string;
    ctoConfigurationId: string;
}

/**
 * DTO pour la réponse d'un devis
 */
export interface QuoteResponse {
    id: string;
    assetId: string;
    ctoConfigurationId: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    status: QuoteStatus;
    isExpired: boolean;
    createdAt: Date;
    expiresAt: Date;
    daysRemaining: number;
}

/**
 * Durée de validité d'un devis (30 jours)
 */
export const QUOTE_VALIDITY_DAYS = 30;

/**
 * Calcule la date d'expiration
 */
function calculateExpirationDate(createdAt: Date): Date {
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + QUOTE_VALIDITY_DAYS);
    return expiresAt;
}

/**
 * Factory pour créer un Quote
 */
export function createQuote(
    companyId: string,
    customerRef: string,
    assetId: string,
    ctoConfigurationId: string,
    priceSnapshot: PriceSnapshot,
    leadTimeDays: number
): Quote {
    const createdAt = new Date();
    return {
        id: uuidv4(),
        companyId,
        customerRef,
        assetId,
        ctoConfigurationId,
        priceSnapshot,
        leadTimeDays,
        status: QuoteStatus.ACTIVE,
        createdAt,
        expiresAt: calculateExpirationDate(createdAt)
    };
}

/**
 * Vérifie si un devis est expiré
 */
export function isQuoteExpired(quote: Quote): boolean {
    return new Date() > quote.expiresAt;
}

/**
 * Calcule les jours restants avant expiration
 */
export function getDaysRemaining(quote: Quote): number {
    const now = new Date();
    const diff = quote.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Transforme un Quote en QuoteResponse
 */
export function toQuoteResponse(quote: Quote): QuoteResponse {
    const expired = isQuoteExpired(quote);
    return {
        id: quote.id,
        assetId: quote.assetId,
        ctoConfigurationId: quote.ctoConfigurationId,
        priceSnapshot: quote.priceSnapshot,
        leadTimeDays: quote.leadTimeDays,
        status: expired ? QuoteStatus.EXPIRED : quote.status,
        isExpired: expired,
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        daysRemaining: getDaysRemaining(quote)
    };
}
