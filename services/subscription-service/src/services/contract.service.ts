/**
 * Contract Service
 * Gestion des contrats pluriannuels
 * 
 * RÈGLES :
 * - ARR déclaré explicitement
 * - Pas de recalcul automatique
 * - Création d'un RenewalPlan à la création
 */

import { PrismaClient, Prisma } from '@prisma/client';
import {
    ContractEntity,
    ContractWithAssets,
    CreateContractDto,
    ClientContractView,
    ContractNotFoundError,
    ContractValidationError
} from '../domain/contract.types';
import { SubscriptionEventData } from '../domain/assetLifecycle.types';

export class ContractService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Créer un contrat avec ARR explicite
     * Génère automatiquement un RenewalPlan
     */
    async createContract(dto: CreateContractDto): Promise<ContractWithAssets> {
        // Validation
        const startDate = new Date(dto.startDate);
        const endDate = new Date(dto.endDate);

        if (endDate <= startDate) {
            throw new ContractValidationError('End date must be after start date');
        }

        if (dto.arrAmount <= 0) {
            throw new ContractValidationError('ARR amount must be positive');
        }

        if (dto.assetIds.length === 0) {
            throw new ContractValidationError('At least one asset required');
        }

        // Transaction : créer contrat + assets + renewal plan
        const contract = await this.prisma.$transaction(async (tx) => {
            // 1. Créer le contrat
            const newContract = await tx.contract.create({
                data: {
                    companyId: dto.companyId,
                    companyName: dto.companyName,
                    startDate,
                    endDate,
                    arrAmount: new Prisma.Decimal(dto.arrAmount),
                    notes: dto.notes || null,
                    status: 'ACTIVE'
                }
            });

            // 2. Ajouter les assets
            await tx.contractAsset.createMany({
                data: dto.assetIds.map(assetId => ({
                    contractId: newContract.id,
                    assetId
                }))
            });

            // 3. Créer le plan de renouvellement
            await tx.renewalPlan.create({
                data: {
                    contractId: newContract.id,
                    plannedDate: endDate,
                    status: 'PLANNED'
                }
            });

            // 4. Logger l'événement
            await this.logEvent(tx, {
                eventType: 'ContractCreated',
                entityType: 'Contract',
                entityId: newContract.id,
                companyId: dto.companyId,
                data: { arrAmount: dto.arrAmount, assetCount: dto.assetIds.length }
            });

            return newContract;
        });

        console.log(`[CONTRACT] Created contract ${contract.id} for ${dto.companyName} with ARR ${dto.arrAmount}`);

        return this.getContractWithAssets(contract.id);
    }

    /**
     * Récupérer un contrat avec ses assets
     */
    async getContractWithAssets(contractId: string): Promise<ContractWithAssets> {
        const contract = await this.prisma.contract.findUnique({
            where: { id: contractId },
            include: { assets: true }
        });

        if (!contract) {
            throw new ContractNotFoundError(contractId);
        }

        const daysRemaining = Math.ceil(
            (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return {
            id: contract.id,
            companyId: contract.companyId,
            companyName: contract.companyName,
            startDate: contract.startDate,
            endDate: contract.endDate,
            arrAmount: contract.arrAmount.toNumber(),
            status: contract.status,
            notes: contract.notes,
            createdAt: contract.createdAt,
            updatedAt: contract.updatedAt,
            assets: contract.assets.map(a => ({
                id: a.id,
                contractId: a.contractId,
                assetId: a.assetId,
                serialNumber: a.serialNumber,
                assetType: a.assetType,
                addedAt: a.addedAt
            })),
            daysRemaining
        };
    }

    /**
     * Récupérer les contrats d'une entreprise (vue interne)
     */
    async getContractsByCompany(companyId: string): Promise<ContractWithAssets[]> {
        const contracts = await this.prisma.contract.findMany({
            where: { companyId },
            include: { assets: true },
            orderBy: { endDate: 'asc' }
        });

        return contracts.map(c => {
            const daysRemaining = Math.ceil(
                (c.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return {
                id: c.id,
                companyId: c.companyId,
                companyName: c.companyName,
                startDate: c.startDate,
                endDate: c.endDate,
                arrAmount: c.arrAmount.toNumber(),
                status: c.status,
                notes: c.notes,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                assets: c.assets.map(a => ({
                    id: a.id,
                    contractId: a.contractId,
                    assetId: a.assetId,
                    serialNumber: a.serialNumber,
                    assetType: a.assetType,
                    addedAt: a.addedAt
                })),
                daysRemaining
            };
        });
    }

    /**
     * Vue client (lecture seule, pas d'ARR)
     */
    async getClientContractView(companyId: string, contractId: string): Promise<ClientContractView | null> {
        const contract = await this.prisma.contract.findFirst({
            where: { id: contractId, companyId },
            include: { assets: true }
        });

        if (!contract) {
            return null;
        }

        const daysRemaining = Math.ceil(
            (contract.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return {
            id: contract.id,
            companyName: contract.companyName,
            startDate: contract.startDate.toISOString(),
            endDate: contract.endDate.toISOString(),
            status: contract.status,
            assetsCount: contract.assets.length,
            daysRemaining
            // ❌ ARR non exposé
        };
    }

    /**
     * Terminer un contrat
     */
    async terminateContract(contractId: string): Promise<void> {
        await this.prisma.contract.update({
            where: { id: contractId },
            data: { status: 'TERMINATED' }
        });

        console.log(`[CONTRACT] Terminated contract ${contractId}`);
    }

    // ============================================
    // HELPERS
    // ============================================

    private async logEvent(
        tx: Prisma.TransactionClient,
        event: SubscriptionEventData
    ): Promise<void> {
        await tx.subscriptionEvent.create({
            data: {
                eventType: event.eventType,
                entityType: event.entityType,
                entityId: event.entityId,
                companyId: event.companyId,
                data: event.data ? JSON.stringify(event.data) : null
            }
        });
    }
}
