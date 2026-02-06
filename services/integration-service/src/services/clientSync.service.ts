/**
 * Client Sync Service
 * Synchronisation parc IT et mappings externes
 * 
 * RÈGLES :
 * - Mapping externe sans modification core
 * - Lecture services amont uniquement
 */

import { PrismaClient } from '@prisma/client';
import {
    EntityType,
    ExternalMappingEntity,
    CreateMappingDto,
    ExposedAsset,
    ExposedTicket,
    CreateTicketDto
} from '../domain/clientIntegration.types';

// URLs services internes
const ASSET_SERVICE_URL = process.env.ASSET_SERVICE_URL || 'http://localhost:3001';
const SAV_SERVICE_URL = process.env.SAV_SERVICE_URL || 'http://localhost:3005';
const DOSSIER_SERVICE_URL = process.env.DOSSIER_SERVICE_URL || 'http://localhost:3011';
const RSE_SERVICE_URL = process.env.RSE_SERVICE_URL || 'http://localhost:3012';

export class ClientSyncService {
    constructor(private readonly prisma: PrismaClient) { }

    // ============================================
    // ASSETS (Lecture)
    // ============================================

    /**
     * Récupérer les assets d'une entreprise
     */
    async getAssets(companyId: string): Promise<ExposedAsset[]> {
        try {
            const response = await fetch(`${ASSET_SERVICE_URL}/assets?companyId=${companyId}`);
            if (!response.ok) return [];

            const data = await response.json() as { data?: unknown[] };
            const assets = data.data || [];

            // Enrichir avec mappings externes
            const mappings = await this.getMappings(companyId, 'ASSET');
            const mappingMap = new Map(mappings.map(m => [m.internalRef, m.externalRef]));

            return assets.map((a: any) => ({
                id: a.id,
                serialNumber: a.serialNumber,
                type: a.assetType,
                brand: a.brand,
                model: a.model,
                status: a.status,
                grade: a.grade || null,
                purchasedAt: a.soldAt || null,
                externalRef: mappingMap.get(a.id)
            }));
        } catch {
            return [];
        }
    }

    /**
     * Récupérer un asset par ID
     */
    async getAsset(companyId: string, assetId: string): Promise<ExposedAsset | null> {
        try {
            const response = await fetch(`${ASSET_SERVICE_URL}/assets/${assetId}`);
            if (!response.ok) return null;

            const data = await response.json() as { data?: any };
            const asset = data.data || data;

            // Vérifier appartenance
            if (asset.companyId && asset.companyId !== companyId) {
                return null; // Cross-tenant blocked
            }

            const mapping = await this.getMapping(companyId, assetId, 'ASSET');

            return {
                id: asset.id,
                serialNumber: asset.serialNumber,
                type: asset.assetType,
                brand: asset.brand,
                model: asset.model,
                status: asset.status,
                grade: asset.grade || null,
                purchasedAt: asset.soldAt || null,
                externalRef: mapping?.externalRef
            };
        } catch {
            return null;
        }
    }

    /**
     * Récupérer le dossier machine
     */
    async getAssetDossier(companyId: string, assetId: string): Promise<unknown | null> {
        try {
            const response = await fetch(`${DOSSIER_SERVICE_URL}/asset-dossiers/${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: unknown };
            return data.data || data;
        } catch {
            return null;
        }
    }

    // ============================================
    // RSE (Lecture)
    // ============================================

    /**
     * Récupérer les rapports RSE
     */
    async getRseReport(companyId: string, period?: string): Promise<unknown | null> {
        try {
            const url = `${RSE_SERVICE_URL}/rse/reports?customerRef=${companyId}${period ? `&period=${period}` : ''}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json() as { data?: unknown };
            return data.data || data;
        } catch {
            return null;
        }
    }

    // ============================================
    // SAV (Lecture + Écriture limitée)
    // ============================================

    /**
     * Récupérer les tickets SAV
     */
    async getTickets(companyId: string): Promise<ExposedTicket[]> {
        try {
            const response = await fetch(`${SAV_SERVICE_URL}/sav/tickets?companyId=${companyId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: any[] };
            return (data.data || []).map(t => ({
                id: t.id,
                assetId: t.assetId,
                status: t.status,
                issue: t.issue,
                createdAt: t.createdAt,
                resolvedAt: t.resolvedAt || null
            }));
        } catch {
            return [];
        }
    }

    /**
     * Créer un ticket SAV (écriture autorisée)
     */
    async createTicket(companyId: string, dto: CreateTicketDto): Promise<{ ticketId: string; ticketRef: string }> {
        const response = await fetch(`${SAV_SERVICE_URL}/sav/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...dto,
                customerRef: companyId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create ticket');
        }

        const data = await response.json() as { data?: { id: string; ticketRef: string } };
        const ticket = data.data!;

        // Créer mapping si externalRef fourni
        if (dto.externalRef) {
            await this.createMapping(companyId, {
                externalRef: dto.externalRef,
                internalRef: ticket.id,
                entityType: 'TICKET'
            });
        }

        console.log(`[SYNC] Ticket created: ${ticket.ticketRef} for company ${companyId}`);

        return { ticketId: ticket.id, ticketRef: ticket.ticketRef };
    }

    // ============================================
    // MAPPINGS
    // ============================================

    async createMapping(companyId: string, dto: CreateMappingDto): Promise<ExternalMappingEntity> {
        const mapping = await this.prisma.externalMapping.create({
            data: {
                companyId,
                externalRef: dto.externalRef,
                internalRef: dto.internalRef,
                entityType: dto.entityType
            }
        });

        return mapping as ExternalMappingEntity;
    }

    async getMapping(
        companyId: string,
        internalRef: string,
        entityType: EntityType
    ): Promise<ExternalMappingEntity | null> {
        const mapping = await this.prisma.externalMapping.findFirst({
            where: { companyId, internalRef, entityType }
        });
        return mapping as ExternalMappingEntity | null;
    }

    async getMappings(companyId: string, entityType: EntityType): Promise<ExternalMappingEntity[]> {
        const mappings = await this.prisma.externalMapping.findMany({
            where: { companyId, entityType }
        });
        return mappings as ExternalMappingEntity[];
    }
}
