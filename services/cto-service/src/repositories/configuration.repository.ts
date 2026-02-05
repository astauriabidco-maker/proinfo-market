/**
 * Configuration Repository
 * Couche d'accès aux données pour les configurations CTO
 */

import { PrismaClient, CtoConfiguration } from '@prisma/client';
import {
    CtoConfigurationEntity,
    CtoComponent,
    PriceSnapshot
} from '../domain/ctoConfiguration.types';

export class ConfigurationRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une configuration validée
     */
    async create(
        assetId: string,
        configuration: CtoComponent[],
        priceSnapshot: PriceSnapshot,
        leadTimeDays: number,
        ruleSetId: string
    ): Promise<CtoConfigurationEntity> {
        const config = await this.prisma.ctoConfiguration.create({
            data: {
                assetId,
                configuration: JSON.stringify(configuration),
                priceSnapshot: JSON.stringify(priceSnapshot),
                leadTimeDays,
                ruleSetId,
                validated: true
            }
        });
        return this.toEntity(config);
    }

    /**
     * Recherche une configuration par ID
     */
    async findById(id: string): Promise<CtoConfigurationEntity | null> {
        const config = await this.prisma.ctoConfiguration.findUnique({
            where: { id }
        });
        return config ? this.toEntity(config) : null;
    }

    /**
     * Recherche les configurations par assetId
     */
    async findByAssetId(assetId: string): Promise<CtoConfigurationEntity[]> {
        const configs = await this.prisma.ctoConfiguration.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return configs.map(c => this.toEntity(c));
    }

    /**
     * Recherche la dernière configuration validée pour un asset
     */
    async findLatestValidatedByAssetId(assetId: string): Promise<CtoConfigurationEntity | null> {
        const config = await this.prisma.ctoConfiguration.findFirst({
            where: { assetId, validated: true },
            orderBy: { createdAt: 'desc' }
        });
        return config ? this.toEntity(config) : null;
    }

    /**
     * Convertit en entité
     */
    private toEntity(config: CtoConfiguration): CtoConfigurationEntity {
        let configuration: CtoComponent[];
        let priceSnapshot: PriceSnapshot;

        try {
            const configParsed = typeof config.configuration === 'string'
                ? JSON.parse(config.configuration)
                : config.configuration;
            configuration = Array.isArray(configParsed) ? configParsed : [];
        } catch {
            configuration = [];
        }

        try {
            const priceParsed = typeof config.priceSnapshot === 'string'
                ? JSON.parse(config.priceSnapshot)
                : config.priceSnapshot;
            priceSnapshot = priceParsed as PriceSnapshot;
        } catch {
            priceSnapshot = {
                components: [],
                laborCost: 0,
                subtotal: 0,
                margin: 0,
                total: 0,
                currency: 'EUR',
                frozenAt: new Date()
            };
        }

        return {
            id: config.id,
            assetId: config.assetId,
            configuration,
            priceSnapshot,
            leadTimeDays: config.leadTimeDays,
            ruleSetId: config.ruleSetId,
            validated: config.validated,
            createdAt: config.createdAt
        };
    }
}
