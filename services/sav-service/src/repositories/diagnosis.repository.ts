/**
 * Diagnosis Repository
 * Couche d'accès aux données pour les diagnostics RMA
 */

import { PrismaClient, RmaDiagnosis, ResolutionType } from '@prisma/client';
import { DiagnosisEntity } from '../domain/diagnosis.types';

export class DiagnosisRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un diagnostic (append-only)
     */
    async create(
        rmaId: string,
        diagnosis: string,
        resolution: ResolutionType
    ): Promise<DiagnosisEntity> {
        const diag = await this.prisma.rmaDiagnosis.create({
            data: {
                rmaId,
                diagnosis,
                resolution
            }
        });
        return this.toEntity(diag);
    }

    /**
     * Recherche le dernier diagnostic pour un RMA
     */
    async findLatestByRmaId(rmaId: string): Promise<DiagnosisEntity | null> {
        const diag = await this.prisma.rmaDiagnosis.findFirst({
            where: { rmaId },
            orderBy: { createdAt: 'desc' }
        });
        return diag ? this.toEntity(diag) : null;
    }

    /**
     * Recherche tous les diagnostics pour un RMA (historique)
     */
    async findAllByRmaId(rmaId: string): Promise<DiagnosisEntity[]> {
        const diags = await this.prisma.rmaDiagnosis.findMany({
            where: { rmaId },
            orderBy: { createdAt: 'asc' }
        });
        return diags.map(d => this.toEntity(d));
    }

    /**
     * Convertit en entité
     */
    private toEntity(diag: RmaDiagnosis): DiagnosisEntity {
        return {
            id: diag.id,
            rmaId: diag.rmaId,
            diagnosis: diag.diagnosis,
            resolution: diag.resolution,
            createdAt: diag.createdAt
        };
    }
}
