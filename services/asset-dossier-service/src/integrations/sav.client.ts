/**
 * SAV Service Client
 * Lecture seule — Tickets, RMAs, diagnostics
 */

export interface SavTicket {
    id: string;
    assetId: string;
    customerRef: string;
    issue: string;
    status: string;
    createdAt: Date;
}

export interface Rma {
    id: string;
    assetId: string;
    ticketId: string;
    status: string;
    createdAt: Date;
}

export interface RmaDiagnosis {
    id: string;
    rmaId: string;
    diagnosis: string;
    resolution: string;
    createdAt: Date;
}

export class SavClient {
    constructor(private readonly baseUrl: string = 'http://localhost:3009') { }

    async getTicketsForAsset(assetId: string): Promise<SavTicket[]> {
        try {
            const response = await fetch(`${this.baseUrl}/sav/tickets?assetId=${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: SavTicket[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    async getRmasForAsset(assetId: string): Promise<Rma[]> {
        try {
            const response = await fetch(`${this.baseUrl}/sav/rmas?assetId=${assetId}`);
            if (!response.ok) return [];
            const data = await response.json() as { data?: Rma[] };
            return data.data || [];
        } catch {
            return [];
        }
    }

    async getDiagnosis(rmaId: string): Promise<RmaDiagnosis | null> {
        try {
            const response = await fetch(`${this.baseUrl}/sav/rmas/${rmaId}/diagnosis`);
            if (!response.ok) return null;
            const data = await response.json() as { data?: RmaDiagnosis };
            return data.data || data as unknown as RmaDiagnosis;
        } catch {
            return null;
        }
    }
}
