/**
 * Water Calculator
 * Calcule les économies d'eau basées sur le type d'Asset
 * 
 * HYPOTHÈSES v1 (fixées) :
 * - Les valeurs sont basées sur l'empreinte eau de fabrication
 * - Source : Études WFN (Water Footprint Network) et LCA secteur IT
 * - Comparaison : Eau évitée = Eau fabrication neuf - Eau reconditionnement
 */

/**
 * Facteurs eau par type d'Asset (litres)
 * 
 * Ces valeurs représentent l'eau douce évitée en choisissant
 * un équipement reconditionné plutôt qu'un neuf.
 * 
 * Méthodologie :
 * - SERVER : Fabrication nécessite ~130 000 L, reconditionnement ~10 000 L = 120 000 L évités
 * - WORKSTATION : ~50 000 L fabrication, ~5 000 L reconditionnement = 45 000 L évités
 * - LAPTOP : ~35 000 L fabrication, ~5 000 L reconditionnement = 30 000 L évités
 * 
 * Note : Inclut l'eau utilisée dans :
 * - Extraction des matières premières
 * - Fabrication des semi-conducteurs
 * - Assemblage et test
 */
export const WATER_FACTORS: Record<string, number> = {
    SERVER: 120000,
    WORKSTATION: 45000,
    LAPTOP: 30000,
    // Valeur par défaut pour types non reconnus
    DEFAULT: 20000
};

/**
 * Calcule l'eau économisée pour un type d'Asset
 */
export function calculateWaterSaved(assetType: string): number {
    const normalizedType = assetType.toUpperCase();
    return WATER_FACTORS[normalizedType] ?? WATER_FACTORS.DEFAULT ?? 20000;
}

/**
 * Métadonnées pour documentation
 */
export const WATER_METHODOLOGY = {
    version: '1.0',
    source: 'Estimations basées sur empreinte eau secteur électronique',
    limitations: [
        'Valeurs moyennes, non spécifiques au modèle exact',
        'Ne différencie pas eau bleue/verte/grise',
        'Basé sur moyennes mondiales de fabrication',
        'Approximations conservatrices'
    ],
    lastUpdated: '2026-02-05'
};
