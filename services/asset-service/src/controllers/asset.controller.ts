/**
 * Asset Controller
 * Gère les requêtes HTTP pour les Assets
 */

import { Request, Response, NextFunction } from 'express';
import { AssetService } from '../services/asset.service';
import { PrismaClient } from '@prisma/client';
import {
    CreateAssetDto,
    ChangeStatusDto,
    DuplicateSerialNumberError,
    AssetNotFoundError,
    InvalidTransitionError
} from '../domain/asset.types';

export class AssetController {
    private readonly assetService: AssetService;

    constructor(prisma: PrismaClient) {
        this.assetService = new AssetService(prisma);
    }

    /**
     * POST /assets
     * Crée un nouvel asset
     */
    createAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto: CreateAssetDto = {
                serialNumber: req.body.serialNumber,
                assetType: req.body.assetType,
                brand: req.body.brand,
                model: req.body.model,
                chassisRef: req.body.chassisRef
            };

            // Validation basique
            if (!dto.serialNumber || !dto.assetType || !dto.brand || !dto.model) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required fields: serialNumber, assetType, brand, model'
                });
                return;
            }

            const asset = await this.assetService.createAsset(dto);

            res.status(201).json(asset);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /assets/:id/status
     * Change le statut d'un asset
     */
    changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.id;
            if (!assetId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: id'
                });
                return;
            }

            const dto: ChangeStatusDto = {
                newStatus: req.body.newStatus,
                reason: req.body.reason
            };

            // Validation basique
            if (!dto.newStatus) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required field: newStatus'
                });
                return;
            }

            const asset = await this.assetService.changeStatus(assetId, dto);

            res.status(200).json(asset);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /assets/:id
     * Récupère un asset par ID
     */
    getAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.id;
            if (!assetId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: id'
                });
                return;
            }

            const asset = await this.assetService.getAsset(assetId);

            res.status(200).json(asset);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /assets/:id/history
     * Récupère l'historique d'un asset
     */
    getAssetHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.id;
            if (!assetId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: id'
                });
                return;
            }

            const history = await this.assetService.getAssetHistory(assetId);

            res.status(200).json(history);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /assets
     * Liste tous les assets
     */
    listAssets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

            const assets = await this.assetService.listAssets(limit, offset);

            res.status(200).json(assets);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Gère les erreurs métier
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof DuplicateSerialNumberError) {
            res.status(409).json({
                error: 'DuplicateSerialNumberError',
                message: error.message,
                serialNumber: error.serialNumber
            });
            return;
        }

        if (error instanceof AssetNotFoundError) {
            res.status(404).json({
                error: 'AssetNotFoundError',
                message: error.message,
                assetId: error.assetId
            });
            return;
        }

        if (error instanceof InvalidTransitionError) {
            res.status(422).json({
                error: 'InvalidTransitionError',
                message: error.message,
                currentStatus: error.currentStatus,
                targetStatus: error.targetStatus
            });
            return;
        }

        // Erreur inattendue
        console.error('[ERROR]', error);
        next(error);
    }
}
