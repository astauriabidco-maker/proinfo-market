/**
 * Premium Options Service
 * Service pour les options premium
 * 
 * RÈGLE : Les options n'impactent pas le CTO validé
 */

import {
    PremiumOptionType,
    PremiumOptionDefinition,
    SelectedPremiumOption,
    PREMIUM_OPTIONS_CATALOG,
    getOptionsForAssetType,
    getOptionByType,
    createSelectedOption,
    calculateOptionsTotal
} from '../models/premium-options.model';

/**
 * Erreur : Option non trouvée
 */
export class OptionNotFoundError extends Error {
    constructor(optionType: string) {
        super(`Premium option ${optionType} not found`);
        this.name = 'OptionNotFoundError';
    }
}

/**
 * Erreur : Option non applicable
 */
export class OptionNotApplicableError extends Error {
    constructor(optionType: string, assetType: string) {
        super(`Option ${optionType} is not applicable to ${assetType}`);
        this.name = 'OptionNotApplicableError';
    }
}

export class PremiumOptionsService {
    /**
     * Récupère le catalogue complet des options
     */
    getCatalog(): PremiumOptionDefinition[] {
        return PREMIUM_OPTIONS_CATALOG;
    }

    /**
     * Récupère les options applicables à un type d'asset
     */
    getOptionsForAssetType(assetType: 'SERVER' | 'WORKSTATION' | 'LAPTOP'): PremiumOptionDefinition[] {
        return getOptionsForAssetType(assetType);
    }

    /**
     * Récupère une option par type
     */
    getOption(type: PremiumOptionType): PremiumOptionDefinition {
        const option = getOptionByType(type);
        if (!option) {
            throw new OptionNotFoundError(type);
        }
        return option;
    }

    /**
     * Valide et crée une liste d'options sélectionnées
     * Vérifie que les options sont applicables au type d'asset
     */
    validateAndCreateOptions(
        optionTypes: PremiumOptionType[],
        assetType: 'SERVER' | 'WORKSTATION' | 'LAPTOP'
    ): SelectedPremiumOption[] {
        const applicableOptions = getOptionsForAssetType(assetType);
        const applicableTypes = new Set(applicableOptions.map(o => o.type));

        const selectedOptions: SelectedPremiumOption[] = [];

        for (const type of optionTypes) {
            // Vérifier que l'option existe
            const definition = getOptionByType(type);
            if (!definition) {
                throw new OptionNotFoundError(type);
            }

            // Vérifier que l'option est applicable
            if (!applicableTypes.has(type)) {
                throw new OptionNotApplicableError(type, assetType);
            }

            const selected = createSelectedOption(type);
            if (selected) {
                selectedOptions.push(selected);
            }
        }

        return selectedOptions;
    }

    /**
     * Calcule le prix total des options
     */
    calculateTotal(options: SelectedPremiumOption[]): number {
        return calculateOptionsTotal(options);
    }

    /**
     * Récupère les extensions de garantie disponibles
     */
    getWarrantyExtensions(): PremiumOptionDefinition[] {
        return PREMIUM_OPTIONS_CATALOG.filter(o =>
            o.type === PremiumOptionType.WARRANTY_3Y ||
            o.type === PremiumOptionType.WARRANTY_5Y
        );
    }

    /**
     * Récupère les options industrielles
     */
    getIndustrialOptions(assetType: 'SERVER' | 'WORKSTATION' | 'LAPTOP'): PremiumOptionDefinition[] {
        return getOptionsForAssetType(assetType).filter(o =>
            o.type !== PremiumOptionType.WARRANTY_3Y &&
            o.type !== PremiumOptionType.WARRANTY_5Y
        );
    }
}
