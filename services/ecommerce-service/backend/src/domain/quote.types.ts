/**
 * Quote Domain Types
 * Sprint 13 - Devis CTO B2B
 * 
 * Types for quote filtering and service layer operations
 */

import { QuoteStatus as PrismaQuoteStatus } from '@prisma/client';
import { PriceSnapshot } from '../integrations/cto.client';

// Re-export Prisma enum for consistency
export { PrismaQuoteStatus as QuoteStatus };

/**
 * Quote entity from database
 */
export interface QuoteEntity {
    id: string;
    companyId: string;
    customerRef: string;
    assetId: string;
    ctoConfigurationId: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    status: PrismaQuoteStatus;
    expiresAt: Date;
    convertedOrderId: string | null;
    createdAt: Date;
}

/**
 * Input for creating a quote
 */
export interface CreateQuoteInput {
    companyId: string;
    customerRef: string;
    assetId: string;
    ctoConfigurationId: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    expiresAt: Date;
}

/**
 * Filters for querying quotes
 */
export interface QuoteFilters {
    status?: PrismaQuoteStatus;
    expiresAfter?: Date;
    expiresBefore?: Date;
}

/**
 * Quote response for API
 */
export interface QuoteResponse {
    id: string;
    assetId: string;
    ctoConfigurationId: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    status: PrismaQuoteStatus;
    isExpired: boolean;
    createdAt: Date;
    expiresAt: Date;
    daysRemaining: number;
}

/**
 * Quote validity duration (30 days)
 */
export const QUOTE_VALIDITY_DAYS = 30;

/**
 * Calculates expiration date from creation date
 */
export function calculateExpirationDate(createdAt: Date = new Date()): Date {
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + QUOTE_VALIDITY_DAYS);
    return expiresAt;
}

/**
 * Checks if a quote is expired
 */
export function isQuoteExpired(quote: Pick<QuoteEntity, 'expiresAt'>): boolean {
    return new Date() > quote.expiresAt;
}

/**
 * Calculates days remaining before expiration
 */
export function getDaysRemaining(quote: Pick<QuoteEntity, 'expiresAt'>): number {
    const now = new Date();
    const diff = quote.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Transforms a Quote entity to API response
 */
export function toQuoteResponse(quote: QuoteEntity): QuoteResponse {
    const expired = isQuoteExpired(quote);
    return {
        id: quote.id,
        assetId: quote.assetId,
        ctoConfigurationId: quote.ctoConfigurationId,
        priceSnapshot: quote.priceSnapshot,
        leadTimeDays: quote.leadTimeDays,
        status: expired && quote.status === 'ACTIVE' ? 'EXPIRED' : quote.status,
        isExpired: expired,
        createdAt: quote.createdAt,
        expiresAt: quote.expiresAt,
        daysRemaining: getDaysRemaining(quote)
    };
}
