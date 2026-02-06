/**
 * Sales Role Types
 * Sprint 15 - Vente Assistée B2B
 * 
 * Rôles pour identifier les acteurs commerciaux
 */

import { SalesActorRole as PrismaSalesActorRole } from '@prisma/client';

// Re-export Prisma enum
export { PrismaSalesActorRole as SalesActorRole };

/**
 * Mapping Keycloak roles -> SalesActorRole
 */
export function keycloakRoleToSalesActorRole(keycloakRole: string): PrismaSalesActorRole {
    switch (keycloakRole.toUpperCase()) {
        case 'SALES_INTERNAL':
            return PrismaSalesActorRole.SALES_INTERNAL;
        case 'TECH_INTERNAL':
            return PrismaSalesActorRole.TECH_INTERNAL;
        case 'ADMIN_CLIENT':
        case 'ACHETEUR':
        case 'LECTURE':
        default:
            return PrismaSalesActorRole.CLIENT;
    }
}

/**
 * Check if role is internal (Sales or Tech)
 */
export function isInternalRole(role: PrismaSalesActorRole): boolean {
    return role === PrismaSalesActorRole.SALES_INTERNAL ||
        role === PrismaSalesActorRole.TECH_INTERNAL;
}

/**
 * Check if role can add attachments (internal only)
 */
export function canAddAttachment(role: PrismaSalesActorRole): boolean {
    return isInternalRole(role);
}

/**
 * Check if role can extend quote (SALES_INTERNAL only)
 */
export function canExtendQuote(role: PrismaSalesActorRole): boolean {
    return role === PrismaSalesActorRole.SALES_INTERNAL;
}

/**
 * Check if role can convert quote (CLIENT only)
 */
export function canConvertQuote(role: PrismaSalesActorRole): boolean {
    return role === PrismaSalesActorRole.CLIENT;
}
