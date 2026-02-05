/**
 * Asset Status Enum
 * Re-export depuis Prisma pour usage dans le domaine
 */

export { AssetStatus, AssetType, AssetGrade } from '@prisma/client';

/**
 * Labels lisibles pour les statuts
 */
export const ASSET_STATUS_LABELS: Record<string, string> = {
    ACQUIRED: 'Acquis',
    IN_REFURB: 'En reconditionnement',
    QUALITY_PENDING: 'En attente qualité',
    SELLABLE: 'Vendable',
    RESERVED: 'Réservé',
    SOLD: 'Vendu',
    RMA: 'Retour SAV',
    SCRAPPED: 'Mis au rebut'
};

/**
 * Labels lisibles pour les types d'asset
 */
export const ASSET_TYPE_LABELS: Record<string, string> = {
    SERVER: 'Serveur',
    WORKSTATION: 'Station de travail',
    LAPTOP: 'Portable'
};

/**
 * Labels lisibles pour les grades
 */
export const ASSET_GRADE_LABELS: Record<string, string> = {
    PREMIUM: 'Premium',
    A: 'Grade A',
    B: 'Grade B',
    C: 'Grade C'
};
