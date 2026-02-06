/**
 * Procurement Analysis Service
 * Module d'aide à la décision d'achat avec simulation de marge
 * 
 * RÈGLES STRICTES :
 * - Aucun achat automatique
 * - Aucune modification des règles qualité
 * - Le système éclaire la décision, l'humain tranche
 */

import { PrismaClient, ProcurementDecision, SupplierType } from '@prisma/client';
import {
    SimulationRequest,
    SimulationResult,
    CostBreakdown,
    RecordDecisionDto,
    LotHistoryFilter,
    MIN_MARGIN_THRESHOLD,
    AVG_RECONDITIONING_COST,
    AVG_RMA_COST,
    DEFAULT_RMA_RATE,
    emitSimulationRun,
    emitDecisionProposed,
    emitDecisionRecorded,
    InvalidSimulationRequestError
} from '../domain/procurementDecision.types';

// ============================================
// DATA PROVIDERS (interfaces pour injection)
// ============================================

export interface SalesDataProvider {
    getAverageSellPrice(model: string): Promise<number | null>;
}

export interface QualityDataProvider {
    getRmaRate(model: string): Promise<number | null>;
    hasActiveAlert(model: string): Promise<boolean>;
}

// ============================================
// SERVICE
// ============================================

export class ProcurementAnalysisService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly salesProvider: SalesDataProvider,
        private readonly qualityProvider: QualityDataProvider
    ) { }

    // ============================================
    // SIMULATION
    // ============================================

    /**
     * Simule la rentabilité d'un lot AVANT achat
     * 
     * RÈGLE : Ne modifie RIEN, calcule et propose seulement
     */
    async simulateLot(request: SimulationRequest): Promise<SimulationResult> {
        // Validation
        this.validateRequest(request);

        const warnings: string[] = [];

        // 1. Récupérer données historiques
        const avgSellPrice = await this.salesProvider.getAverageSellPrice(request.model);
        const rmaRate = await this.qualityProvider.getRmaRate(request.model);
        const hasQualityAlert = await this.qualityProvider.hasActiveAlert(request.model);

        // Fallback si pas de données
        let effectiveSellPrice = avgSellPrice;
        let effectiveRmaRate = rmaRate;

        if (avgSellPrice === null) {
            // Estimation basée sur coût + marge cible 30%
            effectiveSellPrice = request.unitCost * 1.3;
            warnings.push('No historical sales data - using estimated sell price based on 30% target margin');
        }

        if (rmaRate === null) {
            effectiveRmaRate = DEFAULT_RMA_RATE;
            warnings.push(`No RMA data - using default rate ${DEFAULT_RMA_RATE}%`);
        }

        // 2. Calculer coûts
        const costs = this.calculateCosts(request, effectiveRmaRate!);

        // 3. Calculer valeur estimée
        const estimatedValue = request.quantity * effectiveSellPrice!;

        // 4. Calculer marge
        const marginAbsolute = estimatedValue - costs.totalCost;
        const estimatedMargin = (marginAbsolute / estimatedValue) * 100;

        // 5. Proposer décision
        const { decision, reason } = this.proposeDecision(estimatedMargin, hasQualityAlert);

        if (hasQualityAlert) {
            warnings.push('Active quality alert on this model - manual review required');
        }

        const result: SimulationResult = {
            request,
            costs,
            estimatedValue,
            estimatedMargin,
            marginAbsolute,
            suggestedDecision: decision,
            decisionReason: reason,
            warnings,
            calculatedAt: new Date()
        };

        emitSimulationRun(result);
        emitDecisionProposed(decision, reason);

        return result;
    }

    /**
     * Calcule la structure de coûts
     */
    private calculateCosts(request: SimulationRequest, rmaRate: number): CostBreakdown {
        const purchaseCost = request.unitCost * request.quantity;
        const reconditioningCost = request.quantity * AVG_RECONDITIONING_COST;
        const rmaCost = request.quantity * (rmaRate / 100) * AVG_RMA_COST;
        const totalCost = purchaseCost + reconditioningCost + rmaCost;

        return {
            purchaseCost,
            reconditioningCost,
            rmaCost,
            totalCost
        };
    }

    /**
     * Propose une décision basée sur les règles v1
     * 
     * RÈGLE STRICTE : La décision est PROPOSÉE, pas imposée
     */
    private proposeDecision(margin: number, hasQualityAlert: boolean): { decision: ProcurementDecision; reason: string } {
        // Règle 1 : Marge trop faible
        if (margin < MIN_MARGIN_THRESHOLD) {
            return {
                decision: ProcurementDecision.REJECT,
                reason: `Margin ${margin.toFixed(2)}% is below minimum threshold ${MIN_MARGIN_THRESHOLD}%`
            };
        }

        // Règle 2 : Alerte qualité active
        if (hasQualityAlert) {
            return {
                decision: ProcurementDecision.REVIEW,
                reason: 'Active quality alert on this model - manual review required'
            };
        }

        // Règle 3 : Tout est OK
        return {
            decision: ProcurementDecision.ACCEPT,
            reason: `Margin ${margin.toFixed(2)}% meets requirements and no quality issues`
        };
    }

    /**
     * Valide une requête de simulation
     */
    private validateRequest(request: SimulationRequest): void {
        if (!request.supplier || request.supplier.trim() === '') {
            throw new InvalidSimulationRequestError('supplier is required');
        }
        if (!request.model || request.model.trim() === '') {
            throw new InvalidSimulationRequestError('model is required');
        }
        if (request.quantity <= 0) {
            throw new InvalidSimulationRequestError('quantity must be positive');
        }
        if (request.unitCost <= 0) {
            throw new InvalidSimulationRequestError('unitCost must be positive');
        }
    }

    // ============================================
    // DECISION RECORDING
    // ============================================

    /**
     * Enregistre une décision d'achat
     * 
     * RÈGLE : Historique traçable, append-only
     */
    async recordDecision(dto: RecordDecisionDto): Promise<{ id: string }> {
        const lot = await this.prisma.procurementLot.create({
            data: {
                supplierName: dto.supplier,
                supplierType: dto.supplierType as SupplierType,
                purchaseDate: new Date(),
                totalUnitsDeclared: dto.quantity,
                totalPurchasePrice: dto.totalPurchasePrice,
                model: dto.model,
                estimatedValue: dto.estimatedValue,
                estimatedMargin: dto.estimatedMargin,
                decision: dto.decision,
                decisionComment: dto.comment
            }
        });

        emitDecisionRecorded(lot.id, dto.decision);

        return { id: lot.id };
    }

    // ============================================
    // HISTORY
    // ============================================

    /**
     * Récupère l'historique des lots avec filtres
     */
    async getLotHistory(filter: LotHistoryFilter = {}): Promise<any[]> {
        const where: Record<string, unknown> = {};

        if (filter.supplier) where.supplierName = filter.supplier;
        if (filter.model) where.model = filter.model;
        if (filter.decision) where.decision = filter.decision;
        if (filter.fromDate || filter.toDate) {
            where.purchaseDate = {};
            if (filter.fromDate) (where.purchaseDate as Record<string, Date>).gte = filter.fromDate;
            if (filter.toDate) (where.purchaseDate as Record<string, Date>).lte = filter.toDate;
        }

        const lots = await this.prisma.procurementLot.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return lots;
    }
}
