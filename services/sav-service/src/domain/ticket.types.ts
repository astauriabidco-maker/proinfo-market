/**
 * Ticket Types
 * Types pour les tickets SAV
 */

import { TicketStatus } from '@prisma/client';

/**
 * DTO pour créer un ticket SAV
 */
export interface CreateTicketDto {
    assetId: string;
    customerRef: string;
    issue: string;
}

/**
 * Entité Ticket SAV
 */
export interface TicketEntity {
    id: string;
    assetId: string;
    customerRef: string;
    issue: string;
    status: TicketStatus;
    createdAt: Date;
}

/**
 * Erreur : Asset non vendu
 */
export class AssetNotSoldError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly currentStatus: string
    ) {
        super(`Asset ${assetId} is not sold (status: ${currentStatus})`);
        this.name = 'AssetNotSoldError';
    }
}

/**
 * Erreur : Ticket non trouvé
 */
export class TicketNotFoundError extends Error {
    constructor(public readonly ticketId: string) {
        super(`Ticket ${ticketId} not found`);
        this.name = 'TicketNotFoundError';
    }
}

/**
 * Erreur : Ticket déjà fermé
 */
export class TicketClosedError extends Error {
    constructor(public readonly ticketId: string) {
        super(`Ticket ${ticketId} is already closed`);
        this.name = 'TicketClosedError';
    }
}
