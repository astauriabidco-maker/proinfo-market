/**
 * Premium Options Routes
 * Routes pour les options premium
 */

import { Router, Request, Response } from 'express';
import { PremiumOptionsService, OptionNotFoundError, OptionNotApplicableError } from '../services/premium-options.service';
import { PremiumOptionType } from '../models/premium-options.model';

const premiumOptionsService = new PremiumOptionsService();

export function createPremiumOptionsRoutes(): Router {
    const router = Router();

    /**
     * GET /premium-options
     * Récupère le catalogue complet des options premium
     */
    router.get('/', (_req: Request, res: Response) => {
        const catalog = premiumOptionsService.getCatalog();
        res.json(catalog);
    });

    /**
     * GET /premium-options/by-asset-type/:assetType
     * Récupère les options applicables à un type d'asset
     */
    router.get('/by-asset-type/:assetType', (req: Request, res: Response) => {
        const assetTypeParam = req.params.assetType ?? '';
        const assetType = assetTypeParam.toUpperCase() as 'SERVER' | 'WORKSTATION' | 'LAPTOP';

        if (!['SERVER', 'WORKSTATION', 'LAPTOP'].includes(assetType)) {
            res.status(400).json({
                error: 'ValidationError',
                message: 'assetType must be SERVER, WORKSTATION or LAPTOP'
            });
            return;
        }

        const options = premiumOptionsService.getOptionsForAssetType(assetType);
        res.json(options);
    });

    /**
     * GET /premium-options/warranties
     * Récupère les extensions de garantie
     */
    router.get('/warranties', (_req: Request, res: Response) => {
        const warranties = premiumOptionsService.getWarrantyExtensions();
        res.json(warranties);
    });

    /**
     * GET /premium-options/industrial/:assetType
     * Récupère les options industrielles pour un type d'asset
     */
    router.get('/industrial/:assetType', (req: Request, res: Response) => {
        const assetTypeParam = req.params.assetType ?? '';
        const assetType = assetTypeParam.toUpperCase() as 'SERVER' | 'WORKSTATION' | 'LAPTOP';

        if (!['SERVER', 'WORKSTATION', 'LAPTOP'].includes(assetType)) {
            res.status(400).json({
                error: 'ValidationError',
                message: 'assetType must be SERVER, WORKSTATION or LAPTOP'
            });
            return;
        }

        const options = premiumOptionsService.getIndustrialOptions(assetType);
        res.json(options);
    });

    /**
     * POST /premium-options/validate
     * Valide une sélection d'options pour un type d'asset
     * Retourne les options validées avec le total
     */
    router.post('/validate', (req: Request, res: Response) => {
        try {
            const { optionTypes, assetType } = req.body;

            if (!optionTypes || !Array.isArray(optionTypes)) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'optionTypes must be an array'
                });
                return;
            }

            if (!assetType || !['SERVER', 'WORKSTATION', 'LAPTOP'].includes(assetType.toUpperCase())) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'assetType must be SERVER, WORKSTATION or LAPTOP'
                });
                return;
            }

            const normalizedAssetType = assetType.toUpperCase() as 'SERVER' | 'WORKSTATION' | 'LAPTOP';
            const selectedOptions = premiumOptionsService.validateAndCreateOptions(
                optionTypes as PremiumOptionType[],
                normalizedAssetType
            );

            const total = premiumOptionsService.calculateTotal(selectedOptions);

            res.json({
                options: selectedOptions,
                total,
                count: selectedOptions.length
            });
        } catch (error) {
            if (error instanceof OptionNotFoundError) {
                res.status(404).json({
                    error: 'OptionNotFound',
                    message: error.message
                });
                return;
            }
            if (error instanceof OptionNotApplicableError) {
                res.status(400).json({
                    error: 'OptionNotApplicable',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    return router;
}
