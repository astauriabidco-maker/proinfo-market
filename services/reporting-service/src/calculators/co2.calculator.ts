/**
 * CO2 Calculator
 * Calcule les économies de CO2 basées sur le type d'Asset
 * 
 * HYPOTHÈSES v1 (fixées) :
 * - Les valeurs sont basées sur des moyennes sectorielles
 * - Source : Études LCA (Life Cycle Assessment) du secteur IT
 * - Comparaison : CO2 évité = CO2 fabrication neuf - CO2 reconditionnement
 */

/**
 * Facteurs CO2 par type d'Asset (kg CO2 équivalent)
 * 
 * Ces valeurs représentent le CO2 évité en choisissant
 * un équipement reconditionné plutôt qu'un neuf.
 * 
 * Méthodologie :
 * - SERVER : ~1000 kg CO2 fabrication, ~100 kg reconditionnement = 900 kg évités
 * - WORKSTATION : ~400 kg fabrication, ~50 kg reconditionnement = 350 kg évités
 * - LAPTOP : ~250 kg fabrication, ~50 kg reconditionnement = 200 kg évités
 */
export const CO2_FACTORS: Record<string, number> = {
    SERVER: 900,
    WORKSTATION: 350,
    LAPTOP: 200,
    // Valeur par défaut pour types non reconnus
    DEFAULT: 150
};

/**
 * Facteurs énergie associés (kWh)
 * Basé sur le mix énergétique moyen et le contenu CO2 de l'électricité
 */
export const ENERGY_FACTORS: Record<string, number> = {
    SERVER: 500,
    WORKSTATION: 200,
    LAPTOP: 120,
    DEFAULT: 100
};

/**
 * Calcule le CO2 évité pour un type d'Asset
 */
export function calculateCo2Saved(assetType: string): number {
    const normalizedType = assetType.toUpperCase();
    return CO2_FACTORS[normalizedType] ?? CO2_FACTORS.DEFAULT ?? 150;
}

/**
 * Calcule l'énergie économisée pour un type d'Asset (kWh)
 */
export function calculateEnergySaved(assetType: string): number {
    const normalizedType = assetType.toUpperCase();
    return ENERGY_FACTORS[normalizedType] ?? ENERGY_FACTORS.DEFAULT ?? 100;
}

/**
 * Métadonnées pour documentation
 */
export const CO2_METHODOLOGY = {
    version: '1.0',
    source: 'Estimations basées sur études LCA secteur IT',
    limitations: [
        'Valeurs moyennes, non spécifiques au modèle exact',
        'Ne prend pas en compte le transport',
        'Ne compte pas les consommables (emballage, etc.)',
        'Approximations conservatrices'
    ],
    lastUpdated: '2026-02-05'
};
