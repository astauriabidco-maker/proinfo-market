/**
 * Quote Attachment Repository
 * Sprint 15 - Append-only storage
 * 
 * RÈGLE CRITIQUE : PAS de delete / update
 */

import { PrismaClient, QuoteAttachment } from '@prisma/client';
import { QuoteAttachmentEntity } from '../domain/quoteAttachment.types';

export class QuoteAttachmentRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Create a new attachment (append-only)
     */
    async create(
        quoteId: string,
        filename: string,
        url: string
    ): Promise<QuoteAttachmentEntity> {
        const attachment = await this.prisma.quoteAttachment.create({
            data: {
                quoteId,
                filename,
                url
            }
        });

        return this.toEntity(attachment);
    }

    /**
     * Find all attachments for a quote
     */
    async findByQuoteId(quoteId: string): Promise<QuoteAttachmentEntity[]> {
        const attachments = await this.prisma.quoteAttachment.findMany({
            where: { quoteId },
            orderBy: { createdAt: 'asc' }
        });

        return attachments.map(this.toEntity);
    }

    /**
     * Convert Prisma model to entity
     */
    private toEntity(attachment: QuoteAttachment): QuoteAttachmentEntity {
        return {
            id: attachment.id,
            quoteId: attachment.quoteId,
            filename: attachment.filename,
            url: attachment.url,
            createdAt: attachment.createdAt
        };
    }
}
