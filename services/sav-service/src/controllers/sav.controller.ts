/**
 * SAV Controller
 * Gère les requêtes HTTP pour le SAV & RMA
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ResolutionType } from '@prisma/client';
import { SavService } from '../services/sav.service';
import {
    AssetNotSoldError,
    TicketNotFoundError
} from '../domain/ticket.types';
import { RmaNotFoundError, InvalidRmaStatusError } from '../domain/rma.types';
import { RmaNotReceivedError, RmaNotDiagnosedError } from '../domain/diagnosis.types';
import { AssetServiceError } from '../integrations/asset.client';
import { InventoryServiceError } from '../integrations/inventory.client';
import { QualityServiceError } from '../integrations/quality.client';

export class SavController {
    private readonly savService: SavService;

    constructor(prisma: PrismaClient) {
        this.savService = new SavService(prisma);
    }

    // ============================================
    // TICKET ENDPOINTS
    // ============================================

    /**
     * POST /sav/tickets
     * Crée un ticket SAV
     */
    createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, customerRef, issue } = req.body;

            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!customerRef) {
                res.status(400).json({ error: 'ValidationError', message: 'customerRef is required' });
                return;
            }
            if (!issue) {
                res.status(400).json({ error: 'ValidationError', message: 'issue is required' });
                return;
            }

            const ticket = await this.savService.createTicket({ assetId, customerRef, issue });
            res.status(201).json(ticket);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /sav/tickets/:id
     * Récupère un ticket par ID
     */
    getTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ticketId = req.params.id;
            if (!ticketId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const ticket = await this.savService.getTicket(ticketId);
            res.status(200).json(ticket);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ============================================
    // RMA ENDPOINTS
    // ============================================

    /**
     * POST /sav/tickets/:ticketId/rma
     * Crée un RMA pour un ticket
     */
    createRma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ticketId = req.params.ticketId;
            if (!ticketId) {
                res.status(400).json({ error: 'ValidationError', message: 'ticketId is required' });
                return;
            }

            const rma = await this.savService.createRma(ticketId);
            res.status(201).json(rma);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /sav/rma/:rmaId/receive
     * Réception d'un RMA
     */
    receiveRma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rmaId = req.params.rmaId;
            if (!rmaId) {
                res.status(400).json({ error: 'ValidationError', message: 'rmaId is required' });
                return;
            }

            const rma = await this.savService.receiveRma(rmaId);
            res.status(200).json(rma);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /sav/rma/:rmaId/diagnose
     * Diagnostic d'un RMA
     */
    diagnoseRma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rmaId = req.params.rmaId;
            const { diagnosis, resolution } = req.body;

            if (!rmaId) {
                res.status(400).json({ error: 'ValidationError', message: 'rmaId is required' });
                return;
            }
            if (!diagnosis) {
                res.status(400).json({ error: 'ValidationError', message: 'diagnosis is required' });
                return;
            }
            if (!resolution || !Object.values(ResolutionType).includes(resolution)) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: `resolution must be one of: ${Object.values(ResolutionType).join(', ')}`
                });
                return;
            }

            const diag = await this.savService.diagnoseRma(rmaId, { diagnosis, resolution });
            res.status(201).json(diag);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /sav/rma/:rmaId/resolve
     * Résolution d'un RMA
     */
    resolveRma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rmaId = req.params.rmaId;
            if (!rmaId) {
                res.status(400).json({ error: 'ValidationError', message: 'rmaId is required' });
                return;
            }

            const rma = await this.savService.resolveRma(rmaId);
            res.status(200).json(rma);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /sav/rma/:rmaId
     * Récupère un RMA par ID
     */
    getRma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rmaId = req.params.rmaId;
            if (!rmaId) {
                res.status(400).json({ error: 'ValidationError', message: 'rmaId is required' });
                return;
            }

            const rma = await this.savService.getRma(rmaId);
            res.status(200).json(rma);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /sav/rma/:rmaId/diagnosis
     * Récupère l'historique des diagnostics
     */
    getDiagnosisHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rmaId = req.params.rmaId;
            if (!rmaId) {
                res.status(400).json({ error: 'ValidationError', message: 'rmaId is required' });
                return;
            }

            const history = await this.savService.getDiagnosisHistory(rmaId);
            res.status(200).json(history);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Gestion des erreurs
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof AssetNotSoldError) {
            res.status(422).json({ error: 'AssetNotSoldError', message: error.message });
            return;
        }
        if (error instanceof TicketNotFoundError) {
            res.status(404).json({ error: 'TicketNotFoundError', message: error.message });
            return;
        }
        if (error instanceof RmaNotFoundError) {
            res.status(404).json({ error: 'RmaNotFoundError', message: error.message });
            return;
        }
        if (error instanceof InvalidRmaStatusError) {
            res.status(422).json({ error: 'InvalidRmaStatusError', message: error.message });
            return;
        }
        if (error instanceof RmaNotReceivedError) {
            res.status(422).json({ error: 'RmaNotReceivedError', message: error.message });
            return;
        }
        if (error instanceof RmaNotDiagnosedError) {
            res.status(422).json({ error: 'RmaNotDiagnosedError', message: error.message });
            return;
        }
        if (error instanceof AssetServiceError) {
            res.status(502).json({
                error: 'AssetServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }
        if (error instanceof InventoryServiceError) {
            res.status(502).json({
                error: 'InventoryServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }
        if (error instanceof QualityServiceError) {
            res.status(502).json({
                error: 'QualityServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }

        console.error('[ERROR]', error);
        next(error);
    }
}
