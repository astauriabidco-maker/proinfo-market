/**
 * Reporting Controller
 * Gère les requêtes HTTP pour le reporting RSE
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    ReportingService,
    AssetNotEligibleError,
    SnapshotAlreadyExistsError,
    SnapshotNotFoundError
} from '../services/reporting.service';
import { AssetServiceError } from '../integrations/asset.client';
import { OrderServiceError } from '../integrations/order.client';
import { CO2_METHODOLOGY } from '../calculators/co2.calculator';
import { WATER_METHODOLOGY } from '../calculators/water.calculator';

export class ReportingController {
    private readonly reportingService: ReportingService;

    constructor(prisma: PrismaClient) {
        this.reportingService = new ReportingService(prisma);
    }

    /**
     * POST /reporting/assets/:assetId/calculate
     * Calcule le snapshot RSE pour un Asset
     */
    calculateRseSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId } = req.params;

            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }

            const snapshot = await this.reportingService.calculateRseSnapshot(assetId);
            res.status(201).json(snapshot);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /reporting/assets/:assetId
     * Récupère le snapshot RSE d'un Asset
     */
    getRseSnapshot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId } = req.params;

            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }

            const snapshot = await this.reportingService.getRseSnapshot(assetId);

            // Format simplifié pour l'affichage front
            res.status(200).json({
                co2SavedKg: snapshot.co2SavedKg,
                waterSavedL: snapshot.waterSavedL,
                energySavedKwh: snapshot.energySavedKwh
            });
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /reporting/customers/:customerRef
     * Génère le rapport RSE agrégé pour un client
     */
    getCustomerReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { customerRef } = req.params;

            if (!customerRef) {
                res.status(400).json({ error: 'ValidationError', message: 'customerRef is required' });
                return;
            }

            const report = await this.reportingService.getCustomerReport(customerRef);
            res.status(200).json(report);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /reporting/methodology
     * Expose la méthodologie de calcul (transparence)
     */
    getMethodology = async (_req: Request, res: Response): Promise<void> => {
        res.status(200).json({
            co2: CO2_METHODOLOGY,
            water: WATER_METHODOLOGY,
            disclaimer: 'Ces valeurs sont des estimations basées sur des moyennes sectorielles. ' +
                'Elles ne constituent pas une certification officielle.'
        });
    };

    /**
     * Gestion des erreurs
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof AssetNotEligibleError) {
            res.status(422).json({ error: 'AssetNotEligibleError', message: error.message });
            return;
        }
        if (error instanceof SnapshotAlreadyExistsError) {
            res.status(409).json({ error: 'SnapshotAlreadyExistsError', message: error.message });
            return;
        }
        if (error instanceof SnapshotNotFoundError) {
            res.status(404).json({ error: 'SnapshotNotFoundError', message: error.message });
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
        if (error instanceof OrderServiceError) {
            res.status(502).json({
                error: 'OrderServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }

        console.error('[ERROR]', error);
        next(error);
    }
}
