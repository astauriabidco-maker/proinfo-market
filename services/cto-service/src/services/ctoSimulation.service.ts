/**
 * CTO Simulation Service
 * Service de simulation "what-if"
 * 
 * RÈGLES STRICTES :
 * - Lecture seule
 * - Jamais de persistance
 * - Jamais de modification de la config source
 */

import { PrismaClient } from '@prisma/client';
import {
    SimulationRequestDto,
    SimulationResult,
    InvalidSimulationError
} from '../domain/ctoSimulation.types';
import { CtoRuleEngineService } from './ctoRuleEngine.service';
import { CtoComponent } from '../domain/ctoConfiguration.types';

// ============================================
// SERVICE
// ============================================

export class CtoSimulationService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly ruleEngine: CtoRuleEngineService
    ) { }

    // ============================================
    // SIMULATION (READ-ONLY)
    // ============================================

    /**
     * Simuler une configuration
     * 
     * RÈGLE STRICTE :
     * - Ne JAMAIS persister
     * - Ne JAMAIS modifier la config source
     * - Retourner un résultat éphémère
     */
    async simulate(dto: SimulationRequestDto): Promise<SimulationResult> {
        // Validation
        if (!dto.components || dto.components.length === 0) {
            throw new InvalidSimulationError('Components array is required');
        }

        // Si une config de base est fournie, récupérer ses composants
        let baseComponents: CtoComponent[] = [];
        if (dto.baseConfigurationId) {
            const baseConfig = await this.prisma.ctoConfiguration.findUnique({
                where: { id: dto.baseConfigurationId }
            });

            if (!baseConfig) {
                throw new InvalidSimulationError(`Base configuration ${dto.baseConfigurationId} not found`);
            }

            baseComponents = baseConfig.configuration as unknown as CtoComponent[];
        }

        // Fusionner les composants (simulation remplace les existants par type)
        const simulatedComponents = this.mergeComponents(baseComponents, dto.components);

        // Évaluer avec le moteur de règles
        const evaluation = await this.ruleEngine.evaluateConfiguration(simulatedComponents);

        // Construire le résultat éphémère
        const result: SimulationResult = {
            valid: evaluation.passed,
            simulatedAt: new Date(),
            rulesEvaluated: evaluation.rules,
            rulesPassed: evaluation.rules.filter(r => r.passed).map(r => r.ruleName),
            rulesFailed: evaluation.rules.filter(r => !r.passed).map(r => r.ruleName),
            explanations: evaluation.explanations.map(exp => ({
                code: exp.code,
                message: exp.message,
                severity: exp.severity,
                impactedComponents: simulatedComponents
                    .filter(c => exp.message.includes(c.reference))
                    .map(c => c.reference)
            })),
            // Marqueur explicite : ce résultat est éphémère
            _ephemeral: true
        };

        console.log(`[CTO] Simulation completed: ${result.valid ? 'VALID' : 'INVALID'} (${evaluation.rules.length} rules evaluated)`);

        return result;
    }

    /**
     * Fusionner les composants de base avec les modifications
     * Les nouveaux composants remplacent les existants par type
     */
    private mergeComponents(
        baseComponents: CtoComponent[],
        newComponents: CtoComponent[]
    ): CtoComponent[] {
        const merged = new Map<string, CtoComponent>();

        // Ajouter les composants de base
        for (const component of baseComponents) {
            const key = `${component.type}:${component.reference}`;
            merged.set(key, component);
        }

        // Remplacer/ajouter les nouveaux composants
        for (const component of newComponents) {
            // Si le type existe déjà, on remplace
            const existingKey = Array.from(merged.keys()).find(k => k.startsWith(`${component.type}:`));
            if (existingKey) {
                merged.delete(existingKey);
            }
            const key = `${component.type}:${component.reference}`;
            merged.set(key, component);
        }

        return Array.from(merged.values());
    }

    /**
     * Simuler un changement unique sur une configuration existante
     */
    async simulateChange(
        configurationId: string,
        change: { componentType: string; newReference: string; quantity?: number }
    ): Promise<SimulationResult> {
        return this.simulate({
            baseConfigurationId: configurationId,
            components: [{
                type: change.componentType,
                reference: change.newReference,
                quantity: change.quantity ?? 1
            }]
        });
    }
}
