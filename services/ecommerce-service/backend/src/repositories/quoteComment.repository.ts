/**
 * Quote Comment Repository
 * Sprint 15 - Append-only storage
 * 
 * RÈGLE CRITIQUE : PAS de delete / update
 */

import { PrismaClient, QuoteComment, SalesActorRole } from '@prisma/client';
import { QuoteCommentEntity } from '../domain/quoteComment.types';

export class QuoteCommentRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Create a new comment (append-only)
     */
    async create(
        quoteId: string,
        author: SalesActorRole,
        message: string
    ): Promise<QuoteCommentEntity> {
        const comment = await this.prisma.quoteComment.create({
            data: {
                quoteId,
                author,
                message
            }
        });

        return this.toEntity(comment);
    }

    /**
     * Find all comments for a quote
     */
    async findByQuoteId(quoteId: string): Promise<QuoteCommentEntity[]> {
        const comments = await this.prisma.quoteComment.findMany({
            where: { quoteId },
            orderBy: { createdAt: 'asc' }
        });

        return comments.map(this.toEntity);
    }

    /**
     * Convert Prisma model to entity
     */
    private toEntity(comment: QuoteComment): QuoteCommentEntity {
        return {
            id: comment.id,
            quoteId: comment.quoteId,
            author: comment.author,
            message: comment.message,
            createdAt: comment.createdAt
        };
    }
}
