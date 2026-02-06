/**
 * Client Integration Types
 * Types pour les intégrations ITSM/ERP
 * 
 * RÈGLE : Mapping externe sans modification core
 */

/**
 * Types d'entités mappées
 */
export type EntityType = 'ASSET' | 'TICKET' | 'ORDER' | 'INVOICE';

/**
 * Mapping externe
 */
export interface ExternalMappingEntity {
    id: string;
    companyId: string;
    externalRef: string;  // Référence côté client (assetTag, ticketId...)
    internalRef: string;  // Référence ProInfo
    entityType: EntityType;
    createdAt: Date;
}

/**
 * DTO création mapping
 */
export interface CreateMappingDto {
    externalRef: string;
    internalRef: string;
    entityType: EntityType;
}

/**
 * Résultat de sync parc
 */
export interface SyncResult {
    companyId: string;
    syncedAt: Date;
    assetsCreated: number;
    assetsUpdated: number;
    errors: SyncError[];
}

export interface SyncError {
    externalRef: string;
    error: string;
}

/**
 * Asset exposé en API
 */
export interface ExposedAsset {
    id: string;
    serialNumber: string;
    type: string;
    brand: string;
    model: string;
    status: string;
    grade: string | null;
    purchasedAt: string | null;
    externalRef?: string;  // Si mapping existe
}

/**
 * Ticket SAV exposé
 */
export interface ExposedTicket {
    id: string;
    assetId: string;
    status: string;
    issue: string;
    createdAt: string;
    resolvedAt: string | null;
    externalRef?: string;
}

/**
 * DTO création ticket SAV (écriture autorisée)
 */
export interface CreateTicketDto {
    assetId: string;
    issue: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    externalRef?: string;  // Référence ITSM client
}

/**
 * DTO confirmation réception (écriture autorisée)
 */
export interface ConfirmReceivingDto {
    assetId: string;
    receivedAt?: string;
    receivedBy?: string;
    notes?: string;
}
