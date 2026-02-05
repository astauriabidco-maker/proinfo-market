/**
 * Asset State Machine Transitions
 * Définit les transitions autorisées entre statuts
 */

import { AssetStatus } from '@prisma/client';

/**
 * Matrice des transitions autorisées
 * Clé = statut actuel, Valeur = statuts cibles autorisés
 */
export const ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
    ACQUIRED: [AssetStatus.IN_REFURB],
    IN_REFURB: [AssetStatus.QUALITY_PENDING],
    QUALITY_PENDING: [AssetStatus.SELLABLE],
    SELLABLE: [AssetStatus.RESERVED],
    RESERVED: [AssetStatus.SOLD],
    SOLD: [AssetStatus.RMA],
    RMA: [AssetStatus.SELLABLE],
    SCRAPPED: []
};

/**
 * Vérifie si une transition est autorisée
 * 
 * Règle spéciale : vers SCRAPPED autorisé depuis n'importe quel état
 * 
 * @param currentStatus - Statut actuel de l'asset
 * @param targetStatus - Statut cible souhaité
 * @returns true si la transition est autorisée
 */
export function isTransitionAllowed(
    currentStatus: AssetStatus,
    targetStatus: AssetStatus
): boolean {
    // Règle spéciale : SCRAPPED autorisé depuis n'importe quel état
    if (targetStatus === AssetStatus.SCRAPPED) {
        return true;
    }

    // Vérification dans la matrice de transitions
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowedTargets) {
        return false;
    }

    return allowedTargets.includes(targetStatus);
}

/**
 * Obtient les transitions possibles depuis un statut donné
 * 
 * @param currentStatus - Statut actuel
 * @returns Liste des statuts cibles possibles (inclut toujours SCRAPPED)
 */
export function getAvailableTransitions(currentStatus: AssetStatus): AssetStatus[] {
    const transitions = [...(ALLOWED_TRANSITIONS[currentStatus] ?? [])];

    // SCRAPPED est toujours disponible (sauf si déjà SCRAPPED)
    if (currentStatus !== AssetStatus.SCRAPPED && !transitions.includes(AssetStatus.SCRAPPED)) {
        transitions.push(AssetStatus.SCRAPPED);
    }

    return transitions;
}
