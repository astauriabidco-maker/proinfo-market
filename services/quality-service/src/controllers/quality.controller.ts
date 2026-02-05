/**
 * Quality Controller
 * Gère les requêtes HTTP pour la qualité
 */

import { Request, Response, NextFunction } from 'express';
import { QualityService } from '../services/quality.service';
import { PrismaClient, AssetType } from '@prisma/client';
import {
    CreateChecklistDto,
    ChecklistNotFoundError,
    DuplicateChecklistError
} from '../domain/checklist.types';
import {
    RecordQualityResultDto,
    InvalidAssetStatusError,
    QualityResultAlreadyExistsError,
    QualityValidationFailedError
} from '../domain/qualityResult.types';
import { RecordBatteryHealthDto, InvalidStateOfHealthError } from '../domain/battery.types';
import { AssetServiceError } from '../integrations/asset.client';

export class QualityController {
    private readonly qualityService: QualityService;

    constructor(prisma: PrismaClient) {
        this.qualityService = new QualityService(prisma);
    }

    /**
     * POST /quality/checklists
     */
    createChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto: CreateChecklistDto = {
                name: req.body.name,
                assetType: req.body.assetType as AssetType,
                version: req.body.version,
                items: req.body.items ?? []
            };

            if (!dto.name || !dto.assetType || typeof dto.version !== 'number') {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required fields: name, assetType, version'
                });
                return;
            }

            const checklist = await this.qualityService.createChecklist(dto);
            res.status(201).json(checklist);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /quality/checklists
     */
    listChecklists = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const checklists = await this.qualityService.listChecklists();
            res.status(200).json(checklists);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /quality/checklists/:id
     */
    getChecklist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = req.params.id;
            if (!id) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing id' });
                return;
            }
            const checklist = await this.qualityService.getChecklist(id);
            res.status(200).json(checklist);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /quality/assets/:assetId/results
     */
    recordQualityResult = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing assetId' });
                return;
            }

            const dto: RecordQualityResultDto = {
                checklistItemId: req.body.checklistItemId,
                result: req.body.result,
                measuredValue: req.body.measuredValue
            };

            if (!dto.checklistItemId || !dto.result) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'Missing required fields: checklistItemId, result'
                });
                return;
            }

            const result = await this.qualityService.recordQualityResult(assetId, dto);
            res.status(201).json(result);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /quality/assets/:assetId/results
     */
    getQualityResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing assetId' });
                return;
            }
            const results = await this.qualityService.getQualityResults(assetId);
            res.status(200).json(results);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /quality/assets/:assetId/battery
     */
    recordBatteryHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing assetId' });
                return;
            }

            const dto: RecordBatteryHealthDto = {
                stateOfHealth: req.body.stateOfHealth,
                cycles: req.body.cycles
            };

            if (typeof dto.stateOfHealth !== 'number' || typeof dto.cycles !== 'number') {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'stateOfHealth and cycles must be numbers'
                });
                return;
            }

            const battery = await this.qualityService.recordBatteryHealth(assetId, dto);
            res.status(201).json(battery);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /quality/assets/:assetId/battery
     */
    getBatteryHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing assetId' });
                return;
            }
            const battery = await this.qualityService.getBatteryHealth(assetId);
            if (!battery) {
                res.status(404).json({ error: 'NotFound', message: 'Battery health not recorded' });
                return;
            }
            res.status(200).json(battery);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * POST /quality/assets/:assetId/validate
     */
    validateQuality = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'Missing assetId' });
                return;
            }

            const result = await this.qualityService.validateQuality(assetId);
            res.status(200).json({ success: true, validation: result });
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Gère les erreurs métier
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof DuplicateChecklistError) {
            res.status(409).json({
                error: 'DuplicateChecklistError',
                message: error.message
            });
            return;
        }

        if (error instanceof ChecklistNotFoundError) {
            res.status(404).json({
                error: 'ChecklistNotFoundError',
                message: error.message
            });
            return;
        }

        if (error instanceof InvalidAssetStatusError) {
            res.status(422).json({
                error: 'InvalidAssetStatusError',
                message: error.message,
                currentStatus: error.currentStatus,
                expectedStatus: error.expectedStatus
            });
            return;
        }

        if (error instanceof QualityResultAlreadyExistsError) {
            res.status(409).json({
                error: 'QualityResultAlreadyExistsError',
                message: error.message
            });
            return;
        }

        if (error instanceof QualityValidationFailedError) {
            res.status(422).json({
                error: 'QualityValidationFailedError',
                message: error.message,
                validation: error.validationResult
            });
            return;
        }

        if (error instanceof InvalidStateOfHealthError) {
            res.status(400).json({
                error: 'InvalidStateOfHealthError',
                message: error.message
            });
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

        console.error('[ERROR]', error);
        next(error);
    }
}
