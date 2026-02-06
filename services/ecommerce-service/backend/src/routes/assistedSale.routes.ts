/**
 * Assisted Sale Routes
 * Sprint 15 - Vente Assistée B2B
 * 
 * Routes pour la gestion des commentaires, pièces jointes, 
 * prorogation et historique des devis
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, SalesActorRole } from '@prisma/client';
import { QuoteCommentRepository } from '../repositories/quoteComment.repository';
import { QuoteAttachmentRepository } from '../repositories/quoteAttachment.repository';
import { QuoteRepository } from '../repositories/quote.repository';
import {
    AssistedSaleService,
    QuoteNotFoundForSaleError,
    QuoteAlreadyConvertedError,
    UnauthorizedRoleError,
    InvalidExtensionError
} from '../services/assistedSale.service';
import { authMiddleware, getCompanyId } from '../middleware/auth.middleware';
import { keycloakRoleToSalesActorRole } from '../domain/salesRole.types';

/**
 * Extract actor role from request
 */
function getActorRole(req: Request): SalesActorRole {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (req as any).user?.role || 'CLIENT';
    return keycloakRoleToSalesActorRole(userRole);
}

export function createAssistedSaleRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const commentRepository = new QuoteCommentRepository(prisma);
    const attachmentRepository = new QuoteAttachmentRepository(prisma);
    const quoteRepository = new QuoteRepository(prisma);
    const service = new AssistedSaleService(
        commentRepository,
        attachmentRepository,
        quoteRepository
    );

    // Toutes les routes nécessitent l'auth
    router.use(authMiddleware);

    /**
     * POST /v2/quotes/:id/comments
     * Ajouter un commentaire sur un devis
     * Autorisé : tous les rôles authentifiés
     */
    router.post('/:id/comments', async (req: Request, res: Response) => {
        try {
            const quoteId = req.params.id ?? '';
            const { message } = req.body;
            const role = getActorRole(req);

            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'message is required'
                });
                return;
            }

            const comment = await service.addComment(quoteId, role, message.trim());
            res.status(201).json(comment);
        } catch (error) {
            if (error instanceof QuoteNotFoundForSaleError) {
                res.status(404).json({ error: 'QuoteNotFound', message: error.message });
                return;
            }
            if (error instanceof QuoteAlreadyConvertedError) {
                res.status(409).json({ error: 'QuoteConverted', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /v2/quotes/:id/attachments
     * Ajouter une pièce jointe sur un devis
     * Autorisé : SALES_INTERNAL, TECH_INTERNAL uniquement
     */
    router.post('/:id/attachments', async (req: Request, res: Response) => {
        try {
            const quoteId = req.params.id ?? '';
            const { filename, url } = req.body;
            const role = getActorRole(req);

            if (!filename || !url) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'filename and url are required'
                });
                return;
            }

            const attachment = await service.addAttachment(quoteId, role, filename, url);
            res.status(201).json(attachment);
        } catch (error) {
            if (error instanceof QuoteNotFoundForSaleError) {
                res.status(404).json({ error: 'QuoteNotFound', message: error.message });
                return;
            }
            if (error instanceof QuoteAlreadyConvertedError) {
                res.status(409).json({ error: 'QuoteConverted', message: error.message });
                return;
            }
            if (error instanceof UnauthorizedRoleError) {
                res.status(403).json({ error: 'Forbidden', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/quotes/:id/timeline
     * Récupérer la timeline complète d'un devis
     * Autorisé : tous les rôles authentifiés
     */
    router.get('/:id/timeline', async (req: Request, res: Response) => {
        try {
            const quoteId = req.params.id ?? '';
            const timeline = await service.getTimeline(quoteId);
            res.json(timeline);
        } catch (error) {
            if (error instanceof QuoteNotFoundForSaleError) {
                res.status(404).json({ error: 'QuoteNotFound', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /v2/quotes/:id/extend
     * Prolonger un devis
     * Autorisé : SALES_INTERNAL uniquement
     */
    router.post('/:id/extend', async (req: Request, res: Response) => {
        try {
            const quoteId = req.params.id ?? '';
            const { newExpiresAt } = req.body;
            const role = getActorRole(req);

            if (!newExpiresAt) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'newExpiresAt is required'
                });
                return;
            }

            const parsedDate = new Date(newExpiresAt);
            if (isNaN(parsedDate.getTime())) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'newExpiresAt must be a valid date'
                });
                return;
            }

            const result = await service.extendQuote(quoteId, role, parsedDate);
            res.json(result);
        } catch (error) {
            if (error instanceof QuoteNotFoundForSaleError) {
                res.status(404).json({ error: 'QuoteNotFound', message: error.message });
                return;
            }
            if (error instanceof UnauthorizedRoleError) {
                res.status(403).json({ error: 'Forbidden', message: error.message });
                return;
            }
            if (error instanceof InvalidExtensionError) {
                res.status(400).json({ error: 'InvalidExtension', message: error.message });
                return;
            }
            throw error;
        }
    });

    return router;
}
