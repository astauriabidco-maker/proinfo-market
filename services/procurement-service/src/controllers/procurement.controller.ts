/**
 * Procurement Controller
 * Gère les requêtes HTTP pour les lots d'achat et l'intake
 */

import { Request, Response, NextFunction } from 'express';
import { ProcurementService } from '../services/procurement.service';
import { PrismaClient } from '@prisma/client';
import {
    CreateProcurementLotDto,
    IntakeAssetDto,
    ProcurementLotNotFoundError,
    IntakeQuotaExceededError,
    AssetServiceError,
    ValidationError
} from '../domain/procurement.types';

export class ProcurementController {
    private readonly procurementService: ProcurementService;

    constructor(prisma: PrismaClient) {
        this.procurementService = new ProcurementService(prisma);
    }

    /**
     * POST /procurement/lots
     * Crée un nouveau lot d'achat
     */
    createLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto: CreateProcurementLotDto = {
                supplierName: req.body.supplierName,
                supplierType: req.body.supplierType,
                purchaseDate: req.body.purchaseDate,
                totalUnitsDeclared: req.body.totalUnitsDeclared,
                totalPurchasePrice: req.body.totalPurchasePrice
            };

            // Validation basique
            if (!dto.supplierName || !dto.supplierType || !dto.purchaseDate) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required fields: supplierName, supplierType, purchaseDate'
                });
                return;
            }

            if (typeof dto.totalUnitsDeclared !== 'number' || typeof dto.totalPurchasePrice !== 'number') {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'totalUnitsDeclared and totalPurchasePrice must be numbers'
                });
                return;
            }

            const lot = await this.procurementService.createLot(dto);

            res.status(201).json(lot);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /procurement/lots/:lotId/intake
     * Intake d'une machine (création Asset + rattachement)
     */
    intakeAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const lotId = req.params.lotId;
            if (!lotId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: lotId'
                });
                return;
            }

            const dto: IntakeAssetDto = {
                serialNumber: req.body.serialNumber,
                assetType: req.body.assetType,
                brand: req.body.brand,
                model: req.body.model,
                chassisRef: req.body.chassisRef,
                unitCost: req.body.unitCost
            };

            // Validation basique
            if (!dto.serialNumber || !dto.assetType || !dto.brand || !dto.model) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required fields: serialNumber, assetType, brand, model'
                });
                return;
            }

            if (typeof dto.unitCost !== 'number') {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'unitCost must be a number'
                });
                return;
            }

            const item = await this.procurementService.intakeAsset(lotId, dto);

            res.status(201).json(item);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /procurement/lots/:lotId
     * Récupère un lot par ID
     */
    getLot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const lotId = req.params.lotId;
            if (!lotId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: lotId'
                });
                return;
            }

            const lot = await this.procurementService.getLot(lotId);

            res.status(200).json(lot);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /procurement/lots/:lotId/items
     * Récupère les items d'un lot
     */
    getLotItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const lotId = req.params.lotId;
            if (!lotId) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required parameter: lotId'
                });
                return;
            }

            const items = await this.procurementService.getLotItems(lotId);

            res.status(200).json(items);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /procurement/lots
     * Liste tous les lots
     */
    listLots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
            const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

            const lots = await this.procurementService.listLots(limit, offset);

            res.status(200).json(lots);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Gère les erreurs métier
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof ValidationError) {
            res.status(400).json({
                error: 'ValidationError',
                message: error.message
            });
            return;
        }

        if (error instanceof ProcurementLotNotFoundError) {
            res.status(404).json({
                error: 'ProcurementLotNotFoundError',
                message: error.message,
                lotId: error.lotId
            });
            return;
        }

        if (error instanceof IntakeQuotaExceededError) {
            res.status(422).json({
                error: 'IntakeQuotaExceededError',
                message: error.message,
                lotId: error.lotId,
                declared: error.declared,
                current: error.current
            });
            return;
        }

        if (error instanceof AssetServiceError) {
            res.status(502).json({
                error: 'AssetServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode,
                details: error.details
            });
            return;
        }

        // Erreur inattendue
        console.error('[ERROR]', error);
        next(error);
    }
}
