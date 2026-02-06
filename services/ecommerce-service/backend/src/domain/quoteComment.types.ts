/**
 * Quote Comment Types
 * Sprint 15 - Vente Assistée B2B
 * 
 * RÈGLE : Append-only, pas d'édition ni de suppression
 */

import { SalesActorRole } from './salesRole.types';

/**
 * Quote Comment entity from database
 */
export interface QuoteCommentEntity {
    id: string;
    quoteId: string;
    author: SalesActorRole;
    message: string;
    createdAt: Date;
}

/**
 * DTO for creating a comment
 */
export interface CreateCommentDto {
    message: string;
}

/**
 * Comment response for API
 */
export interface QuoteCommentResponse {
    id: string;
    author: string;
    message: string;
    createdAt: Date;
}

/**
 * Transform entity to response
 */
export function toQuoteCommentResponse(comment: QuoteCommentEntity): QuoteCommentResponse {
    return {
        id: comment.id,
        author: comment.author,
        message: comment.message,
        createdAt: comment.createdAt
    };
}
