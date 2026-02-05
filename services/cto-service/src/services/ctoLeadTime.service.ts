/**
 * CTO Lead Time Service
 * Logique de calcul du délai de livraison
 */

import { PrismaClient, RuleType } from '@prisma/client';
import { RuleRepository } from '../repositories/rule.repository';
import { CtoComponent } from '../domain/ctoConfiguration.types';
import { LeadTimeRulePayload } from '../rules/rule.types';

// Constantes de temps (en minutes)
const DEFAULT_ASSEMBLY_MINUTES = 90;
const DEFAULT_QA_MINUTES = 30;
const WORKING_HOURS_PER_DAY = 8;
const MINUTES_PER_HOUR = 60;

export class CtoLeadTimeService {
    private readonly ruleRepository: RuleRepository;

    constructor(prisma: PrismaClient) {
        this.ruleRepository = new RuleRepository(prisma);
    }

    /**
     * Calcule le lead time en jours
     * 
     * Basé sur :
     * - Temps assemblage fixe (ou depuis règles)
     * - QA fixe
     */
    async calculateLeadTime(
        ruleSetId: string,
        components: CtoComponent[]
    ): Promise<number> {
        const ruleSet = await this.ruleRepository.findRuleSetById(ruleSetId);
        const leadTimeRules = ruleSet?.rules.filter(r => r.ruleType === RuleType.LEAD_TIME) ?? [];

        let totalAssemblyMinutes = 0;
        let qaMinutes = DEFAULT_QA_MINUTES;

        // Calculer le temps pour chaque composant
        for (const component of components) {
            const rule = leadTimeRules.find(r => {
                const payload = r.payload as LeadTimeRulePayload;
                return payload.componentType === component.type;
            });

            if (rule) {
                const payload = rule.payload as LeadTimeRulePayload;
                totalAssemblyMinutes += payload.assemblyMinutes * component.quantity;
            } else {
                // Temps par défaut par composant
                totalAssemblyMinutes += DEFAULT_ASSEMBLY_MINUTES;
            }
        }

        // Chercher une règle QA globale
        const qaRule = leadTimeRules.find(r => {
            const payload = r.payload as LeadTimeRulePayload;
            return !payload.componentType;
        });
        if (qaRule) {
            const payload = qaRule.payload as LeadTimeRulePayload;
            qaMinutes = payload.qaMinutes;
        }

        // Total en minutes
        const totalMinutes = totalAssemblyMinutes + qaMinutes;

        // Convertir en jours ouvrés (arrondi au supérieur)
        const totalHours = totalMinutes / MINUTES_PER_HOUR;
        const leadTimeDays = Math.ceil(totalHours / WORKING_HOURS_PER_DAY);

        // Minimum 1 jour
        return Math.max(1, leadTimeDays);
    }
}
