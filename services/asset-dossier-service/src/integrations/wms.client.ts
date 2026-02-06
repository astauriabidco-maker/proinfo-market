/**
 * WMS Service Client
 * Lecture seule — Tasks, steps, shipments
 */

export interface WmsTask {
    id: string;
    assetId: string;
    type: string;
    status: string;
    operatorId: string | null;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
}

export interface TaskStep {
    id: string;
    taskId: string;
    stepOrder: number;
    description: string;
    scanRequired: boolean;
    completed: boolean;
    completedAt: Date | null;
}

export interface Shipment {
    id: string;
    assetId: string;
    carrier: string;
    trackingRef: string | null;
    status: string;
    createdAt: Date;
}

export class WmsClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3008') { }

    async getTasksForAsset(assetId: string): Promise<WmsTask[]> {
        try {
            const response = await fetch(`${this.baseUrl}/wms/tasks?assetId=${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: WmsTask[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    async getTaskSteps(taskId: string): Promise<TaskStep[]> {
        try {
            const response = await fetch(`${this.baseUrl}/wms/tasks/${taskId}/steps`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: TaskStep[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    async getShipmentForAsset(assetId: string): Promise<Shipment | null> {
        try {
            const response = await fetch(`${this.baseUrl}/wms/shipments?assetId=${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: Shipment[] };
            const shipments = data.data || [];
            return shipments[0] || null;
        } catch {
            return null;
        }
    }
}
