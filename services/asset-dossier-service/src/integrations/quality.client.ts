/**
 * Quality Service Client
 * Lecture seule — QA results, battery health, alerts
 */

export interface QualityResult {
    id: string;
    assetId: string;
    checklistItemId: string;
    result: 'PASS' | 'FAIL';
    measuredValue: string | null;
    createdAt: Date;
}

export interface BatteryHealth {
    assetId: string;
    stateOfHealth: number;
    cycles: number;
    measuredAt: Date;
}

export interface QualityAlert {
    id: string;
    type: string;
    scope: string;
    reason: string;
    active: boolean;
    createdAt: Date;
}

export class QualityClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3003') { }

    async getQualityResults(assetId: string): Promise<QualityResult[]> {
        try {
            const response = await fetch(`${this.baseUrl}/quality/results/${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: QualityResult[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    async getBatteryHealth(assetId: string): Promise<BatteryHealth | null> {
        try {
            const response = await fetch(`${this.baseUrl}/quality/battery/${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: BatteryHealth };
            return data.data || data as unknown as BatteryHealth;
        } catch {
            return null;
        }
    }

    async getAlertsForAsset(assetId: string): Promise<QualityAlert[]> {
        try {
            const response = await fetch(`${this.baseUrl}/quality/alerts?assetId=${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: QualityAlert[] };
            return data.data || [];
        } catch {
            return [];
        }
    }
}
