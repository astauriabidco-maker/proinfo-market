/**
 * Quote Repository
 * Sprint 13 - Prisma-based quote persistence
 * 
 * RÈGLE CRITIQUE : Le priceSnapshot est stocké en JSON et JAMAIS modifié
 */

import { Prisma, PrismaClient, Quote, QuoteStatus } from '@prisma/client';
import { CreateQuoteInput, QuoteFilters, QuoteEntity } from '../domain/quote.types';
import { PriceSnapshot } from '../integrations/cto.client';

export class QuoteRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Creates a new quote with frozen price snapshot
     */
    async create(input: CreateQuoteInput): Promise<QuoteEntity> {
        const quote = await this.prisma.quote.create({
            data: {
                companyId: input.companyId,
                customerRef: input.customerRef,
                assetId: input.assetId,
                ctoConfigurationId: input.ctoConfigurationId,
                priceSnapshot: input.priceSnapshot as object,
                leadTimeDays: input.leadTimeDays,
                expiresAt: input.expiresAt,
                status: QuoteStatus.ACTIVE
            }
        });

        return this.toEntity(quote);
    }

    /**
     * Finds a quote by ID
     */
    async findById(id: string): Promise<QuoteEntity | null> {
        const quote = await this.prisma.quote.findUnique({
            where: { id }
        });

        return quote ? this.toEntity(quote) : null;
    }

    /**
     * Finds all quotes for a company with optional filters
     */
    async findByCompany(
        companyId: string,
        filters?: QuoteFilters
    ): Promise<QuoteEntity[]> {
        const where: Prisma.QuoteWhereInput = {
            companyId
        };

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.expiresAfter) {
            where.expiresAt = {
                ...where.expiresAt as object,
                gte: filters.expiresAfter
            };
        }

        if (filters?.expiresBefore) {
            where.expiresAt = {
                ...where.expiresAt as object,
                lte: filters.expiresBefore
            };
        }

        const quotes = await this.prisma.quote.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        return quotes.map(q => this.toEntity(q));
    }

    /**
     * Updates quote status (for expiration or conversion)
     */
    async updateStatus(
        id: string,
        status: QuoteStatus,
        convertedOrderId?: string
    ): Promise<QuoteEntity> {
        const quote = await this.prisma.quote.update({
            where: { id },
            data: {
                status,
                convertedOrderId: convertedOrderId ?? null
            }
        });

        return this.toEntity(quote);
    }

    /**
     * Updates quote expiration date (for extension)
     * Sprint 15 - Vente Assistée
     * 
     * NOTE: N'actualise PAS le priceSnapshot
     */
    async updateExpiresAt(
        id: string,
        newExpiresAt: Date
    ): Promise<QuoteEntity> {
        const quote = await this.prisma.quote.update({
            where: { id },
            data: { expiresAt: newExpiresAt }
        });

        return this.toEntity(quote);
    }

    /**
     * Converts Prisma model to domain entity
     */
    private toEntity(quote: Quote): QuoteEntity {
        return {
            id: quote.id,
            companyId: quote.companyId,
            customerRef: quote.customerRef,
            assetId: quote.assetId,
            ctoConfigurationId: quote.ctoConfigurationId,
            priceSnapshot: quote.priceSnapshot as unknown as PriceSnapshot,
            leadTimeDays: quote.leadTimeDays,
            status: quote.status,
            expiresAt: quote.expiresAt,
            convertedOrderId: quote.convertedOrderId,
            createdAt: quote.createdAt
        };
    }
}
