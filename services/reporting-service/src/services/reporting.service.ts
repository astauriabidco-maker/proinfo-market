/**
 * Reporting Service
 * Logique métier pour le calcul et l'agrégation RSE
 * 
 * RÈGLE : Le RSE informe, il ne décide pas.
 * Les snapshots sont figés une fois calculés.
 */

import { PrismaClient, RseSnapshot } from '@prisma/client';
import { calculateCo2Saved, calculateEnergySaved } from '../calculators/co2.calculator';
import { calculateWaterSaved } from '../calculators/water.calculator';
import { AssetServiceClient, HttpAssetServiceClient } from '../integrations/asset.client';
import { OrderServiceClient, HttpOrderServiceClient } from '../integrations/order.client';

// Types
export interface RseSnapshotDto {
    id: string;
    assetId: string;
    co2SavedKg: number;
    waterSavedL: number;
    energySavedKwh: number;
    calculatedAt: Date;
}

export interface CustomerRseReport {
    customerRef: string;
    assetCount: number;
    totalCo2SavedKg: number;
    totalWaterSavedL: number;
    totalEnergySavedKwh: number;
    generatedAt: Date;
}

// Errors
export class AssetNotEligibleError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly currentStatus: string
    ) {
        super(`Asset ${assetId} is not eligible for RSE calculation (status: ${currentStatus})`);
        this.name = 'AssetNotEligibleError';
    }
}

export class SnapshotAlreadyExistsError extends Error {
    constructor(public readonly assetId: string) {
        super(`RSE snapshot already exists for asset ${assetId}`);
        this.name = 'SnapshotAlreadyExistsError';
    }
}

export class SnapshotNotFoundError extends Error {
    constructor(public readonly assetId: string) {
        super(`No RSE snapshot found for asset ${assetId}`);
        this.name = 'SnapshotNotFoundError';
    }
}

// Statuts éligibles pour le calcul RSE
const ELIGIBLE_STATUSES = ['SELLABLE', 'SOLD', 'RESERVED'];

export class ReportingService {
    private readonly prisma: PrismaClient;
    private readonly assetClient: AssetServiceClient;
    private readonly orderClient: OrderServiceClient;

    constructor(
        prisma: PrismaClient,
        assetClient?: AssetServiceClient,
        orderClient?: OrderServiceClient
    ) {
        this.prisma = prisma;
        this.assetClient = assetClient ?? new HttpAssetServiceClient();
        this.orderClient = orderClient ?? new HttpOrderServiceClient();
    }

    /**
     * Calcule et crée un snapshot RSE pour un Asset
     * Règle : Ne recalcule JAMAIS un snapshot existant
     */
    async calculateRseSnapshot(assetId: string): Promise<RseSnapshotDto> {
        // Vérifier si un snapshot existe déjà
        const existing = await this.prisma.rseSnapshot.findUnique({
            where: { assetId }
        });

        if (existing) {
            throw new SnapshotAlreadyExistsError(assetId);
        }

        // Récupérer l'Asset
        const asset = await this.assetClient.getAsset(assetId);

        // Vérifier éligibilité
        if (!ELIGIBLE_STATUSES.includes(asset.status)) {
            throw new AssetNotEligibleError(assetId, asset.status);
        }

        // Calculer les valeurs RSE
        const co2SavedKg = calculateCo2Saved(asset.assetType);
        const waterSavedL = calculateWaterSaved(asset.assetType);
        const energySavedKwh = calculateEnergySaved(asset.assetType);

        // Créer le snapshot (figé)
        const snapshot = await this.prisma.rseSnapshot.create({
            data: {
                assetId,
                co2SavedKg,
                waterSavedL,
                energySavedKwh
            }
        });

        return this.toDto(snapshot);
    }

    /**
     * Récupère le snapshot RSE d'un Asset
     */
    async getRseSnapshot(assetId: string): Promise<RseSnapshotDto> {
        const snapshot = await this.prisma.rseSnapshot.findUnique({
            where: { assetId }
        });

        if (!snapshot) {
            throw new SnapshotNotFoundError(assetId);
        }

        return this.toDto(snapshot);
    }

    /**
     * Génère un rapport RSE agrégé par client
     */
    async getCustomerReport(customerRef: string): Promise<CustomerRseReport> {
        // Récupérer les commandes du client
        const orders = await this.orderClient.getOrdersByCustomer(customerRef);

        if (orders.length === 0) {
            return {
                customerRef,
                assetCount: 0,
                totalCo2SavedKg: 0,
                totalWaterSavedL: 0,
                totalEnergySavedKwh: 0,
                generatedAt: new Date()
            };
        }

        // Récupérer les assetIds des commandes
        const assetIds = orders.map(o => o.assetId);

        // Récupérer les snapshots pour ces assets
        const snapshots = await this.prisma.rseSnapshot.findMany({
            where: {
                assetId: { in: assetIds }
            }
        });

        // Agréger les valeurs
        const totalCo2SavedKg = snapshots.reduce((sum, s) => sum + s.co2SavedKg, 0);
        const totalWaterSavedL = snapshots.reduce((sum, s) => sum + s.waterSavedL, 0);
        const totalEnergySavedKwh = snapshots.reduce((sum, s) => sum + s.energySavedKwh, 0);

        return {
            customerRef,
            assetCount: snapshots.length,
            totalCo2SavedKg,
            totalWaterSavedL,
            totalEnergySavedKwh,
            generatedAt: new Date()
        };
    }

    /**
     * Convertit un snapshot Prisma en DTO
     */
    private toDto(snapshot: RseSnapshot): RseSnapshotDto {
        return {
            id: snapshot.id,
            assetId: snapshot.assetId,
            co2SavedKg: snapshot.co2SavedKg,
            waterSavedL: snapshot.waterSavedL,
            energySavedKwh: snapshot.energySavedKwh,
            calculatedAt: snapshot.calculatedAt
        };
    }
}
