/**
 * Inventory Service Client
 * Lecture seule — Stock locations, movements
 */

export interface StockLocation {
    id: string;
    assetId: string;
    warehouseId: string;
    status: string;
    orderId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Warehouse {
    id: string;
    code: string;
    name: string;
    country: string;
    active: boolean;
}

export interface InventoryMovement {
    id: string;
    assetId: string;
    fromLocation: string | null;
    toLocation: string | null;
    reason: string;
    createdAt: Date;
}

export class InventoryClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3002') { }

    async getStockLocation(assetId: string): Promise<StockLocation | null> {
        try {
            const response = await fetch(`${this.baseUrl}/inventory/stock/${assetId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: StockLocation };
            return data.data || data as unknown as StockLocation;
        } catch {
            return null;
        }
    }

    async getWarehouse(warehouseId: string): Promise<Warehouse | null> {
        try {
            const response = await fetch(`${this.baseUrl}/inventory/warehouses/${warehouseId}`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: Warehouse };
            return data.data || data as unknown as Warehouse;
        } catch {
            return null;
        }
    }

    async getMovements(assetId: string): Promise<InventoryMovement[]> {
        try {
            const response = await fetch(`${this.baseUrl}/inventory/movements?assetId=${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: InventoryMovement[] };
            return data.data || [];
        } catch {
            return [];
        }
    }
}
