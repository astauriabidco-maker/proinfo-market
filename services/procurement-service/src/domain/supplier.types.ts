/**
 * Supplier Types
 * Types pour les fournisseurs
 */

export { SupplierType } from '@prisma/client';

/**
 * Labels lisibles pour les types de fournisseur
 */
export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
    LEASING: 'Leasing',
    ENTERPRISE: 'Entreprise',
    INDIVIDUAL: 'Particulier'
};
