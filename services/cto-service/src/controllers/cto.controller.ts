/**
 * CTO Controller
 * Gère les requêtes HTTP pour le CTO Engine
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { CtoValidationService } from '../services/ctoValidation.service';
import { CtoPricingService } from '../services/ctoPricing.service';
import { CtoLeadTimeService } from '../services/ctoLeadTime.service';
import { ConfigurationRepository } from '../repositories/configuration.repository';
import { emitCtoValidated, emitCtoRejected } from '../events/cto.events';
import {
    ValidateCtoDto,
    CtoValidationResult,
    AssetNotSellableError,
    NoActiveRuleSetError,
    ConfigurationNotFoundError
} from '../domain/ctoConfiguration.types';
import { InventoryServiceError } from '../integrations/inventory.client';
import { AssetServiceError } from '../integrations/asset.client';

export class CtoController {
    private readonly validationService: CtoValidationService;
    private readonly pricingService: CtoPricingService;
    private readonly leadTimeService: CtoLeadTimeService;
    private readonly configurationRepository: ConfigurationRepository;

    constructor(prisma: PrismaClient) {
        this.validationService = new CtoValidationService(prisma);
        this.pricingService = new CtoPricingService(prisma);
        this.leadTimeService = new CtoLeadTimeService(prisma);
        this.configurationRepository = new ConfigurationRepository(prisma);
    }

    /**
     * POST /cto/validate
     * Valide une configuration CTO complète
     */
    validateConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto = req.body as ValidateCtoDto;

            // Validation input
            if (!dto.assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!dto.productModel) {
                res.status(400).json({ error: 'ValidationError', message: 'productModel is required' });
                return;
            }
            if (!dto.components || !Array.isArray(dto.components) || dto.components.length === 0) {
                res.status(400).json({ error: 'ValidationError', message: 'components array is required' });
                return;
            }

            // 1-3. Validation (Asset SELLABLE + RuleSet + Rules)
            const validationResult = await this.validationService.validate(dto);

            if (!validationResult.valid || !validationResult.ruleSet) {
                emitCtoRejected(dto.assetId, validationResult.errors);
                const result: CtoValidationResult = {
                    valid: false,
                    errors: validationResult.errors
                };
                res.status(422).json(result);
                return;
            }

            const ruleSetId = validationResult.ruleSet.id;

            // 5. Calculer pricing snapshot (FIGÉ)
            const priceSnapshot = await this.pricingService.calculatePriceSnapshot(
                ruleSetId,
                dto.components
            );

            // 6. Calculer lead time
            const leadTimeDays = await this.leadTimeService.calculateLeadTime(
                ruleSetId,
                dto.components
            );

            // 7. Créer CtoConfiguration (validated = true)
            const configuration = await this.configurationRepository.create(
                dto.assetId,
                dto.components,
                priceSnapshot,
                leadTimeDays,
                ruleSetId
            );

            // Générer l'ordre d'assemblage
            const assemblyOrder = this.validationService.generateAssemblyOrder(dto);

            // 8. Émettre événement
            emitCtoValidated(configuration);

            const result: CtoValidationResult = {
                valid: true,
                configurationId: configuration.id,
                errors: [],
                priceSnapshot,
                leadTimeDays,
                assemblyOrder
            };
            res.status(201).json(result);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /cto/configurations/:id
     * Récupère une configuration par ID
     */
    getConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const configurationId = req.params.id;
            if (!configurationId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const configuration = await this.configurationRepository.findById(configurationId);
            if (!configuration) {
                throw new ConfigurationNotFoundError(configurationId);
            }

            // Générer l'ordre d'assemblage depuis la configuration
            const assemblyOrder = {
                assetId: configuration.assetId,
                tasks: this.generateTasksFromComponents(configuration.configuration)
            };

            res.status(200).json({
                ...configuration,
                assemblyOrder
            });
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /cto/configurations/:id/price
     * Récupère le prix snapshot (jamais recalculé)
     */
    getPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const configurationId = req.params.id;
            if (!configurationId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const configuration = await this.configurationRepository.findById(configurationId);
            if (!configuration) {
                throw new ConfigurationNotFoundError(configurationId);
            }

            // Retourner le prix FIGÉ, jamais recalculé
            res.status(200).json({
                configurationId: configuration.id,
                priceSnapshot: configuration.priceSnapshot,
                frozenAt: configuration.priceSnapshot.frozenAt,
                message: 'Price is frozen and will not be recalculated'
            });
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Génère les tâches depuis les composants
     */
    private generateTasksFromComponents(components: { type: string }[]): string[] {
        const tasks: string[] = [];
        const typeOrder = ['CPU', 'RAM', 'SSD', 'HDD', 'NIC', 'GPU', 'RAID'];

        for (const type of typeOrder) {
            const hasType = components.some(c => c.type === type);
            if (hasType) {
                tasks.push(`INSTALL_${type}`);
            }
        }
        tasks.push('RUN_QA');
        return tasks;
    }

    /**
     * Gestion des erreurs
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof AssetNotSellableError) {
            res.status(422).json({ error: 'AssetNotSellableError', message: error.message });
            return;
        }
        if (error instanceof NoActiveRuleSetError) {
            res.status(500).json({ error: 'NoActiveRuleSetError', message: error.message });
            return;
        }
        if (error instanceof ConfigurationNotFoundError) {
            res.status(404).json({ error: 'ConfigurationNotFoundError', message: error.message });
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
