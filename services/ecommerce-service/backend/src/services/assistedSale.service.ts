/**
 * Assisted Sale Service
 * Sprint 15 - Vente Assistée B2B
 * 
 * RÈGLES CRITIQUES :
 * - Le priceSnapshot est INVIOLABLE
 * - Les commentaires sont append-only
 * - Seul SALES_INTERNAL peut prolonger un devis
 * - Pas d'édition du CTO
 */

import { SalesActorRole } from '@prisma/client';
import { QuoteCommentRepository } from '../repositories/quoteComment.repository';
import { QuoteAttachmentRepository } from '../repositories/quoteAttachment.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import {
    QuoteCommentEntity,
    QuoteCommentResponse,
    toQuoteCommentResponse
} from '../domain/quoteComment.types';
import {
    QuoteAttachmentEntity,
    QuoteAttachmentResponse,
    toQuoteAttachmentResponse
} from '../domain/quoteAttachment.types';
import {
    isInternalRole,
    canAddAttachment,
    canExtendQuote
} from '../domain/salesRole.types';

/**
 * Erreur : Devis non trouvé
 */
export class QuoteNotFoundForSaleError extends Error {
    constructor(quoteId: string) {
        super(`Quote ${quoteId} not found`);
        this.name = 'QuoteNotFoundForSaleError';
    }
}

/**
 * Erreur : Devis déjà converti
 */
export class QuoteAlreadyConvertedError extends Error {
    constructor(quoteId: string) {
        super(`Cannot modify converted quote ${quoteId}`);
        this.name = 'QuoteAlreadyConvertedError';
    }
}

/**
 * Erreur : Rôle non autorisé
 */
export class UnauthorizedRoleError extends Error {
    constructor(action: string, role: string) {
        super(`Role ${role} is not authorized to ${action}`);
        this.name = 'UnauthorizedRoleError';
    }
}

/**
 * Erreur : Extension non valide
 */
export class InvalidExtensionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidExtensionError';
    }
}

/**
 * Élément de timeline (commentaire ou pièce jointe)
 */
export interface TimelineItem {
    type: 'comment' | 'attachment';
    id: string;
    createdAt: Date;
    data: QuoteCommentResponse | QuoteAttachmentResponse;
}

/**
 * Timeline complète
 */
export interface QuoteTimeline {
    quoteId: string;
    items: TimelineItem[];
}

export class AssistedSaleService {
    constructor(
        private readonly commentRepository: QuoteCommentRepository,
        private readonly attachmentRepository: QuoteAttachmentRepository,
        private readonly quoteRepository: QuoteRepository
    ) { }

    /**
     * Ajouter un commentaire sur un devis
     * 
     * Autorisé : CLIENT, SALES_INTERNAL, TECH_INTERNAL
     * Interdit : devis CONVERTED
     */
    async addComment(
        quoteId: string,
        author: SalesActorRole,
        message: string
    ): Promise<QuoteCommentResponse> {
        // Vérifier que le devis existe et n'est pas converti
        await this.checkQuoteModifiable(quoteId);

        const comment = await this.commentRepository.create(quoteId, author, message);
        return toQuoteCommentResponse(comment);
    }

    /**
     * Ajouter une pièce jointe sur un devis
     * 
     * Autorisé : SALES_INTERNAL, TECH_INTERNAL uniquement
     */
    async addAttachment(
        quoteId: string,
        role: SalesActorRole,
        filename: string,
        url: string
    ): Promise<QuoteAttachmentResponse> {
        // Vérifier les droits
        if (!canAddAttachment(role)) {
            throw new UnauthorizedRoleError('add attachments', role);
        }

        // Vérifier que le devis existe et n'est pas converti
        await this.checkQuoteModifiable(quoteId);

        const attachment = await this.attachmentRepository.create(quoteId, filename, url);
        return toQuoteAttachmentResponse(attachment);
    }

    /**
     * Prolonger un devis
     * 
     * Autorisé : SALES_INTERNAL uniquement
     * Règles :
     * - Devis ACTIVE uniquement
     * - newExpiresAt > currentExpiresAt
     * - Commentaire automatique ajouté
     */
    async extendQuote(
        quoteId: string,
        role: SalesActorRole,
        newExpiresAt: Date
    ): Promise<{ success: boolean; newExpiresAt: Date }> {
        // Vérifier les droits
        if (!canExtendQuote(role)) {
            throw new UnauthorizedRoleError('extend quote', role);
        }

        // Récupérer le devis
        const quote = await this.quoteRepository.findById(quoteId);
        if (!quote) {
            throw new QuoteNotFoundForSaleError(quoteId);
        }

        // Vérifier le statut
        if (quote.status !== 'ACTIVE') {
            throw new InvalidExtensionError(`Cannot extend quote with status ${quote.status}`);
        }

        // Vérifier la nouvelle date
        if (newExpiresAt <= quote.expiresAt) {
            throw new InvalidExtensionError('New expiration date must be after current expiration date');
        }

        // Mettre à jour la date d'expiration
        await this.quoteRepository.updateExpiresAt(quoteId, newExpiresAt);

        // Ajouter un commentaire automatique
        const oldDate = quote.expiresAt.toISOString().split('T')[0];
        const newDate = newExpiresAt.toISOString().split('T')[0];
        await this.commentRepository.create(
            quoteId,
            SalesActorRole.SALES_INTERNAL,
            `📅 Devis prolongé du ${oldDate} au ${newDate}`
        );

        return { success: true, newExpiresAt };
    }

    /**
     * Récupérer la timeline complète d'un devis
     * 
     * Retourne tous les commentaires et pièces jointes en ordre chronologique
     */
    async getTimeline(quoteId: string): Promise<QuoteTimeline> {
        // Vérifier que le devis existe
        const quote = await this.quoteRepository.findById(quoteId);
        if (!quote) {
            throw new QuoteNotFoundForSaleError(quoteId);
        }

        // Récupérer les éléments
        const comments = await this.commentRepository.findByQuoteId(quoteId);
        const attachments = await this.attachmentRepository.findByQuoteId(quoteId);

        // Fusionner en timeline chronologique
        const items: TimelineItem[] = [
            ...comments.map(c => ({
                type: 'comment' as const,
                id: c.id,
                createdAt: c.createdAt,
                data: toQuoteCommentResponse(c)
            })),
            ...attachments.map(a => ({
                type: 'attachment' as const,
                id: a.id,
                createdAt: a.createdAt,
                data: toQuoteAttachmentResponse(a)
            }))
        ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        return { quoteId, items };
    }

    /**
     * Vérifier que le devis peut être modifié
     */
    private async checkQuoteModifiable(quoteId: string): Promise<void> {
        const quote = await this.quoteRepository.findById(quoteId);

        if (!quote) {
            throw new QuoteNotFoundForSaleError(quoteId);
        }

        if (quote.status === 'CONVERTED') {
            throw new QuoteAlreadyConvertedError(quoteId);
        }
    }
}
