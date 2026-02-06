/**
 * Asset Client (Read-Only)
 * Client lecture seule pour asset-service
 * 
 * RÈGLE : Aucune écriture, agrégation uniquement
 */

import { AssetCategory } from '../domain/rseMethodology.types';

const ASSET_SERVICE_URL = process.env.ASSET_SERVICE_URL || 'http://localhost:3001';

export interface AssetData {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    weight?: number;  // kg (pour calcul matières)
    status: string;
    grade?: string;
    createdAt: Date;
}

export interface OrderAsset {
    assetId: string;
    orderId: string;
    customerRef: string;
    soldAt: Date;
}

export class AssetClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || ASSET_SERVICE_URL;
    }

    /**
     * Récupérer un asset par ID
     */
    async getAsset(assetId: string): Promise<AssetData | null> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: AssetData };
            return data.data || data as unknown as AssetData;
        } catch {
            return null;
        }
    }

    /**
     * Récupérer assets par client
     */
    async getAssetsByCustomer(customerRef: string): Promise<OrderAsset[]> {
        try {
            const response = await fetch(`${this.baseUrl}/assets?customerRef=${customerRef}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: OrderAsset[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    /**
     * Mapper le type d'asset vers une catégorie RSE
     */
    static mapToCategory(assetType: string): AssetCategory {
        const typeUpper = assetType.toUpperCase();
        if (typeUpper.includes('LAPTOP') || typeUpper.includes('NOTEBOOK')) {
            return 'LAPTOP';
        }
        if (typeUpper.includes('SERVER')) {
            return 'SERVER';
        }
        if (typeUpper.includes('WORKSTATION')) {
            return 'WORKSTATION';
        }
        if (typeUpper.includes('DESKTOP') || typeUpper.includes('PC')) {
            return 'DESKTOP';
        }
        return 'OTHER';
    }

    /**
     * Poids estimé par catégorie (kg)
     * Utilisé si weight non disponible
     */
    static getEstimatedWeight(category: AssetCategory): number {
        const weights: Record<AssetCategory, number> = {
            LAPTOP: 2.5,
            SERVER: 25,
            WORKSTATION: 12,
            DESKTOP: 8,
            OTHER: 5
        };
        return weights[category];
    }
}
