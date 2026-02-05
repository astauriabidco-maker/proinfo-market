/**
 * Premium Options Model
 * Options premium vendables en complément du CTO
 * 
 * RÈGLE CRITIQUE : Les options n'impactent PAS le CTO validé
 * Elles sont ajoutées en ligne distincte
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Types d'options premium
 */
export enum PremiumOptionType {
    // Extensions de garantie
    WARRANTY_3Y = 'WARRANTY_3Y',
    WARRANTY_5Y = 'WARRANTY_5Y',

    // Options industrielles
    NEW_BATTERY = 'NEW_BATTERY',
    SOFTWARE_PREINSTALL = 'SOFTWARE_PREINSTALL',
    LABELING = 'LABELING',
    INVENTORY_TAG = 'INVENTORY_TAG'
}

/**
 * Définition d'une option premium
 */
export interface PremiumOptionDefinition {
    type: PremiumOptionType;
    name: string;
    description: string;
    price: number;
    applicableTo: ('SERVER' | 'WORKSTATION' | 'LAPTOP')[];
    // Ce que ça couvre / ne couvre pas
    covers?: string[];
    excludes?: string[];
}

/**
 * Option premium sélectionnée pour un devis/commande
 */
export interface SelectedPremiumOption {
    id: string;
    optionType: PremiumOptionType;
    name: string;
    price: number;
}

/**
 * Catalogue des options premium
 */
export const PREMIUM_OPTIONS_CATALOG: PremiumOptionDefinition[] = [
    // Extensions de garantie
    {
        type: PremiumOptionType.WARRANTY_3Y,
        name: 'Extension garantie 3 ans',
        description: 'Extension de la garantie pièces et main d\'œuvre à 3 ans',
        price: 199,
        applicableTo: ['SERVER', 'WORKSTATION', 'LAPTOP'],
        covers: [
            'Pannes matérielles',
            'Défauts de fabrication',
            'Remplacement pièces défectueuses',
            'Main d\'œuvre SAV'
        ],
        excludes: [
            'Dommages accidentels',
            'Oxydation / liquides',
            'Mauvaise utilisation',
            'Logiciels / données'
        ]
    },
    {
        type: PremiumOptionType.WARRANTY_5Y,
        name: 'Extension garantie 5 ans',
        description: 'Extension de la garantie pièces et main d\'œuvre à 5 ans',
        price: 349,
        applicableTo: ['SERVER', 'WORKSTATION', 'LAPTOP'],
        covers: [
            'Pannes matérielles',
            'Défauts de fabrication',
            'Remplacement pièces défectueuses',
            'Main d\'œuvre SAV',
            'Intervention sur site (serveurs)'
        ],
        excludes: [
            'Dommages accidentels',
            'Oxydation / liquides',
            'Mauvaise utilisation',
            'Logiciels / données'
        ]
    },

    // Options industrielles
    {
        type: PremiumOptionType.NEW_BATTERY,
        name: 'Batterie neuve',
        description: 'Remplacement de la batterie par une batterie neuve d\'origine',
        price: 89,
        applicableTo: ['LAPTOP'],
        covers: ['Batterie neuve avec garantie constructeur 1 an']
    },
    {
        type: PremiumOptionType.SOFTWARE_PREINSTALL,
        name: 'Pré-installation logicielle',
        description: 'Configuration système selon vos spécifications (OS, drivers, applications)',
        price: 49,
        applicableTo: ['SERVER', 'WORKSTATION', 'LAPTOP'],
        covers: [
            'Installation OS fourni par le client',
            'Configuration réseau',
            'Installation applications client',
            'Documentation de configuration'
        ]
    },
    {
        type: PremiumOptionType.LABELING,
        name: 'Étiquetage personnalisé',
        description: 'Étiquettes d\'inventaire avec votre référencement interne',
        price: 15,
        applicableTo: ['SERVER', 'WORKSTATION', 'LAPTOP'],
        covers: [
            'Étiquettes code-barres/QR',
            'Numérotation interne client',
            'Export fichier inventaire'
        ]
    },
    {
        type: PremiumOptionType.INVENTORY_TAG,
        name: 'Tag RFID inventaire',
        description: 'Tag RFID pour suivi d\'inventaire automatisé',
        price: 25,
        applicableTo: ['SERVER', 'WORKSTATION', 'LAPTOP'],
        covers: [
            'Tag RFID UHF',
            'Encodage référence client',
            'Compatible lecteurs standards'
        ]
    }
];

/**
 * Récupère une option par type
 */
export function getOptionByType(type: PremiumOptionType): PremiumOptionDefinition | undefined {
    return PREMIUM_OPTIONS_CATALOG.find(o => o.type === type);
}

/**
 * Récupère les options applicables à un type d'asset
 */
export function getOptionsForAssetType(assetType: 'SERVER' | 'WORKSTATION' | 'LAPTOP'): PremiumOptionDefinition[] {
    return PREMIUM_OPTIONS_CATALOG.filter(o => o.applicableTo.includes(assetType));
}

/**
 * Crée une option sélectionnée
 */
export function createSelectedOption(type: PremiumOptionType): SelectedPremiumOption | null {
    const definition = getOptionByType(type);
    if (!definition) return null;

    return {
        id: uuidv4(),
        optionType: type,
        name: definition.name,
        price: definition.price
    };
}

/**
 * Calcule le total des options sélectionnées
 */
export function calculateOptionsTotal(options: SelectedPremiumOption[]): number {
    return options.reduce((total, opt) => total + opt.price, 0);
}
