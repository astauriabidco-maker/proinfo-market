/**
 * CTO Pricing Service
 * Logique de calcul des prix CTO
 * 
 * DÉTERMINISTE : Le prix est figé (snapshot), jamais recalculé.
 */

import { PrismaClient, RuleType } from '@prisma/client';
import { RuleRepository } from '../repositories/rule.repository';
import {
    CtoComponent,
    PriceSnapshot,
    ComponentPrice
} from '../domain/ctoConfiguration.types';
import { PRICING_DEFAULTS } from '../domain/pricing.types';
import { PricingRulePayload } from '../rules/rule.types';

export class CtoPricingService {
    private readonly ruleRepository: RuleRepository;

    constructor(prisma: PrismaClient) {
        this.ruleRepository = new RuleRepository(prisma);
    }

    /**
     * Calcule le prix snapshot (FIGÉ)
     * 
     * Les règles PRICING sont lues exclusivement depuis la DB.
     */
    async calculatePriceSnapshot(
        ruleSetId: string,
        components: CtoComponent[]
    ): Promise<PriceSnapshot> {
        const ruleSet = await this.ruleRepository.findRuleSetById(ruleSetId);
        const pricingRules = ruleSet?.rules.filter(r => r.ruleType === RuleType.PRICING) ?? [];

        // Construire une map des règles de pricing par type/reference
        const pricingMap = new Map<string, PricingRulePayload>();
        for (const rule of pricingRules) {
            const payload = rule.payload as PricingRulePayload;
            const key = payload.reference
                ? `${payload.componentType}:${payload.reference}`
                : payload.componentType;
            pricingMap.set(key, payload);
        }

        // Calculer le prix de chaque composant
        const componentPrices: ComponentPrice[] = [];
        let totalLaborCost = 0;

        for (const component of components) {
            // Chercher une règle spécifique (type:reference) puis générale (type)
            const specificKey = `${component.type}:${component.reference}`;
            const genericKey = component.type;
            const pricingRule = pricingMap.get(specificKey) ?? pricingMap.get(genericKey);

            const unitPrice = pricingRule?.unitPrice ?? 0;
            const laborCost = pricingRule?.laborCost ?? PRICING_DEFAULTS.DEFAULT_LABOR_COST;

            componentPrices.push({
                type: component.type,
                reference: component.reference,
                quantity: component.quantity,
                unitPrice,
                lineTotal: unitPrice * component.quantity
            });

            totalLaborCost += laborCost * component.quantity;
        }

        // Calculer totaux
        const subtotal = componentPrices.reduce((sum, cp) => sum + cp.lineTotal, 0);
        const averageMargin = this.calculateAverageMargin(pricingRules, components);
        const margin = (subtotal + totalLaborCost) * (averageMargin / 100);
        const total = subtotal + totalLaborCost + margin;

        return {
            components: componentPrices,
            laborCost: totalLaborCost,
            subtotal,
            margin,
            total,
            currency: PRICING_DEFAULTS.CURRENCY,
            frozenAt: new Date()
        };
    }

    /**
     * Calcule la marge moyenne pondérée
     */
    private calculateAverageMargin(
        pricingRules: { payload: unknown }[],
        components: CtoComponent[]
    ): number {
        if (pricingRules.length === 0) {
            return PRICING_DEFAULTS.DEFAULT_MARGIN_PERCENT;
        }

        let totalMargin = 0;
        let count = 0;

        for (const component of components) {
            const rule = pricingRules.find(r => {
                const payload = r.payload as PricingRulePayload;
                return payload.componentType === component.type;
            });

            if (rule) {
                const payload = rule.payload as PricingRulePayload;
                totalMargin += payload.marginPercent * component.quantity;
                count += component.quantity;
            }
        }

        return count > 0 ? totalMargin / count : PRICING_DEFAULTS.DEFAULT_MARGIN_PERCENT;
    }
}
