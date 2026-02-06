/**
 * Export Types
 * Types pour l'export audit-ready
 * 
 * RÈGLE : Export complet, lisible par auditeur non technique
 */

export type ExportFormat = 'PDF' | 'JSON' | 'ZIP';

/**
 * Options d'export
 */
export interface ExportOptions {
    format: ExportFormat;
    includeAttachments?: boolean;
    language?: 'fr' | 'en';
}

/**
 * Résultat d'export
 */
export interface ExportResult {
    assetId: string;
    format: ExportFormat;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    generatedAt: Date;
}

/**
 * Contenu d'un bundle ZIP audit-ready
 */
export interface AuditBundle {
    /** PDF synthèse lisible */
    pdfSummary: Buffer;

    /** JSON complet structuré */
    jsonFull: string;

    /** Pièces jointes (si existantes) */
    attachments: BundleAttachment[];

    /** Métadonnées du bundle */
    manifest: BundleManifest;
}

/**
 * Pièce jointe dans le bundle
 */
export interface BundleAttachment {
    filename: string;
    mimeType: string;
    content: Buffer;
    source: string;
}

/**
 * Manifeste du bundle
 */
export interface BundleManifest {
    assetId: string;
    serialNumber: string;
    generatedAt: Date;
    version: string;
    files: string[];
    checksum: string;
}
