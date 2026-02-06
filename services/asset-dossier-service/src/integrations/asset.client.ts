/**
 * Asset Service Client
 * Lecture seule — Asset identity & state history
 */

export interface AssetData {
    id: string;
    serialNumber: string;
    assetType: string;
    brand: string;
    model: string;
    chassisRef: string | null;
    status: string;
    grade: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface AssetStateHistoryEntry {
    id: string;
    assetId: string;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: Date;
}

export class AssetClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3001') { }

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

    async getStateHistory(assetId: string): Promise<AssetStateHistoryEntry[]> {
        try {
            const response = await fetch(`${this.baseUrl}/assets/${assetId}/history`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: AssetStateHistoryEntry[] };
            return data.data || [];
        } catch {
            return [];
        }
    }
}
