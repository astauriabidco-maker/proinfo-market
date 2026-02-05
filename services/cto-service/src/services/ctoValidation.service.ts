/**
 * CTO Validation Service
 * Logique de validation des configurations CTO
 * 
 * DÉTERMINISTE : Applique les règles, ne les invente pas.
 */

import { PrismaClient } from '@prisma/client';
import { RuleRepository } from '../repositories/rule.repository';
import { RuleEngine } from '../rules/rule.engine';
import {
    AssetServiceClient,
    HttpAssetServiceClient
} from '../integrations/asset.client';
import {
    ValidateCtoDto,
    CtoValidationError,
    AssetNotSellableError,
    NoActiveRuleSetError,
    InvalidConfigurationError
} from '../domain/ctoConfiguration.types';
import { CtoRuleSetEntity } from '../rules/rule.types';

export interface ValidationServiceResult {
    valid: boolean;
    errors: CtoValidationError[];
    ruleSet?: CtoRuleSetEntity;
}

export class CtoValidationService {
    private readonly ruleRepository: RuleRepository;
    private readonly ruleEngine: RuleEngine;
    private readonly assetClient: AssetServiceClient;

    constructor(
        prisma: PrismaClient,
        assetClient?: AssetServiceClient
    ) {
        this.ruleRepository = new RuleRepository(prisma);
        this.ruleEngine = new RuleEngine();
        this.assetClient = assetClient ?? new HttpAssetServiceClient();
    }

    /**
     * Valide une configuration CTO
     * 
     * Étapes :
     * 1. Vérifier Asset = SELLABLE
     * 2. Charger RuleSet actif
     * 3. Valider règles (COMPATIBILITY, QUANTITY, DEPENDENCY, EXCLUSION)
     */
    async validate(dto: ValidateCtoDto): Promise<ValidationServiceResult> {
        // 1. Vérifier Asset = SELLABLE
        const asset = await this.assetClient.getAsset(dto.assetId);
        if (asset.status !== 'SELLABLE') {
            throw new AssetNotSellableError(dto.assetId, asset.status);
        }

        // 2. Charger RuleSet actif
        const ruleSet = await this.ruleRepository.findActiveRuleSet();
        if (!ruleSet) {
            throw new NoActiveRuleSetError();
        }

        // 3. Valider règles
        const errors = this.ruleEngine.evaluateValidationRules(
            ruleSet,
            dto.productModel,
            dto.components
        );

        if (errors.length > 0) {
            return { valid: false, errors, ruleSet };
        }

        return { valid: true, errors: [], ruleSet };
    }

    /**
     * Génère l'ordre d'assemblage
     */
    generateAssemblyOrder(dto: ValidateCtoDto): { assetId: string; tasks: string[] } {
        const tasks = this.ruleEngine.generateAssemblyTasks(dto.components);
        return {
            assetId: dto.assetId,
            tasks
        };
    }
}
