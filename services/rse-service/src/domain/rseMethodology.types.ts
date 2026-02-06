/**
 * RSE Methodology Types
 * Types pour les méthodologies versionnées
 * 
 * RÈGLE : Chaque méthodologie est immuable après création
 */

/**
 * Facteurs de calcul par catégorie d'équipement
 * Sources : ADEME, EPEAT, études publiques
 */
export interface CalculationFactors {
    /** CO2 évité par kg de matériel reconditionné (vs neuf) */
    co2AvoidedPerKg: Record<AssetCategory, number>;

    /** Eau économisée par unité reconditionnée (litres) */
    waterSavedPerUnit: Record<AssetCategory, number>;

    /** Matières premières évitées par kg (kg) */
    materialSavedPerKg: Record<AssetCategory, number>;
}

export type AssetCategory = 'LAPTOP' | 'SERVER' | 'WORKSTATION' | 'DESKTOP' | 'OTHER';

/**
 * DTO pour création de méthodologie
 */
export interface CreateMethodologyDto {
    /** Version unique (ex: "2026-Q1-ADEME") */
    version: string;

    /** Description claire de la méthodologie */
    description: string;

    /** Sources publiques (ADEME, EPEAT, etc.) */
    sources: string;

    /** Facteurs de calcul */
    factors: CalculationFactors;
}

/**
 * Entité méthodologie persistée
 */
export interface RseMethodologyEntity {
    id: string;
    version: string;
    description: string;
    sources: string;
    factors: CalculationFactors;
    createdAt: Date;
}

/**
 * Facteurs ADEME par défaut (v1)
 * Source : Base carbone ADEME 2024
 */
export const DEFAULT_ADEME_FACTORS: CalculationFactors = {
    co2AvoidedPerKg: {
        LAPTOP: 156,      // kg CO2-eq évités par laptop reconditionné
        SERVER: 1200,     // kg CO2-eq évités par serveur
        WORKSTATION: 250, // kg CO2-eq évités par workstation
        DESKTOP: 180,     // kg CO2-eq évités par desktop
        OTHER: 100        // Estimation conservatrice
    },
    waterSavedPerUnit: {
        LAPTOP: 190000,   // litres économisés
        SERVER: 500000,
        WORKSTATION: 280000,
        DESKTOP: 200000,
        OTHER: 100000
    },
    materialSavedPerKg: {
        LAPTOP: 0.85,     // 85% des matières évitées
        SERVER: 0.90,
        WORKSTATION: 0.85,
        DESKTOP: 0.85,
        OTHER: 0.75
    }
};

// ============================================
// ERRORS
// ============================================

export class MethodologyVersionExistsError extends Error {
    constructor(public readonly version: string) {
        super(`Methodology version ${version} already exists`);
        this.name = 'MethodologyVersionExistsError';
    }
}

export class NoActiveMethodologyError extends Error {
    constructor() {
        super('No active methodology found. Create one first.');
        this.name = 'NoActiveMethodologyError';
    }
}
