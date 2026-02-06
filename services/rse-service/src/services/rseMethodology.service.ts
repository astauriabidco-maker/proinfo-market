/**
 * RSE Methodology Service
 * Gestion des méthodologies versionnées
 * 
 * RÈGLE STRICTE : Append-only, jamais de modification
 * Une nouvelle méthodologie = nouvelle version
 */

import { PrismaClient } from '@prisma/client';
import {
    CreateMethodologyDto,
    RseMethodologyEntity,
    MethodologyVersionExistsError,
    NoActiveMethodologyError,
    CalculationFactors
} from '../domain/rseMethodology.types';

export class RseMethodologyService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Créer une nouvelle version de méthodologie
     * RÈGLE : Version unique, jamais d'overwrite
     */
    async createMethodology(dto: CreateMethodologyDto): Promise<RseMethodologyEntity> {
        // Vérifier que la version n'existe pas
        const existing = await this.prisma.rseMethodology.findUnique({
            where: { version: dto.version }
        });

        if (existing) {
            throw new MethodologyVersionExistsError(dto.version);
        }

        const methodology = await this.prisma.rseMethodology.create({
            data: {
                version: dto.version,
                description: dto.description,
                sources: dto.sources,
                factors: dto.factors as object
            }
        });

        console.log(`[RSE] Methodology created: ${methodology.version}`);

        return this.toEntity(methodology);
    }

    /**
     * Récupérer la méthodologie active (la plus récente)
     */
    async getActiveMethodology(): Promise<RseMethodologyEntity> {
        const methodology = await this.prisma.rseMethodology.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (!methodology) {
            throw new NoActiveMethodologyError();
        }

        return this.toEntity(methodology);
    }

    /**
     * Récupérer une méthodologie par ID
     */
    async getMethodologyById(id: string): Promise<RseMethodologyEntity | null> {
        const methodology = await this.prisma.rseMethodology.findUnique({
            where: { id }
        });

        return methodology ? this.toEntity(methodology) : null;
    }

    /**
     * Récupérer l'historique des méthodologies
     */
    async getMethodologyHistory(): Promise<RseMethodologyEntity[]> {
        const methodologies = await this.prisma.rseMethodology.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return methodologies.map(m => this.toEntity(m));
    }

    /**
     * Mapper vers l'entité domaine
     */
    private toEntity(record: {
        id: string;
        version: string;
        description: string;
        sources: string;
        factors: unknown;
        createdAt: Date;
    }): RseMethodologyEntity {
        return {
            id: record.id,
            version: record.version,
            description: record.description,
            sources: record.sources,
            factors: record.factors as CalculationFactors,
            createdAt: record.createdAt
        };
    }
}
