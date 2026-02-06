/**
 * Quote Attachment Types
 * Sprint 15 - Vente Assistée B2B
 * 
 * RÈGLE : Append-only, réservé aux rôles internes
 */

/**
 * Quote Attachment entity from database
 */
export interface QuoteAttachmentEntity {
    id: string;
    quoteId: string;
    filename: string;
    url: string;
    createdAt: Date;
}

/**
 * DTO for creating an attachment
 */
export interface CreateAttachmentDto {
    filename: string;
    url: string;
}

/**
 * Attachment response for API
 */
export interface QuoteAttachmentResponse {
    id: string;
    filename: string;
    url: string;
    createdAt: Date;
}

/**
 * Transform entity to response
 */
export function toQuoteAttachmentResponse(attachment: QuoteAttachmentEntity): QuoteAttachmentResponse {
    return {
        id: attachment.id,
        filename: attachment.filename,
        url: attachment.url,
        createdAt: attachment.createdAt
    };
}
