/**
 * Asset Dossier Builder Service
 * Construit un dossier machine complet et immuable
 * 
 * RÈGLES STRICTES :
 * - Agrégation lecture seule depuis 6 services
 * - Anonymisation des opérateurs
 * - Snapshot figé jamais modifié
 * - Aucun enrichissement interprétatif
 */

import { PrismaClient } from '@prisma/client';
import {
    AssetDossier,
    DossierMeta,
    AssetIdentity,
    CtoConfigurationSection,
    RefurbishmentSection,
    QualitySection,
    SavSection,
    LogisticsSection,
    FinalStatusSection,
    WmsTaskInfo,
    QaChecklistResult,
    AssetNotFoundError,
    DossierBuildError
} from '../domain/assetDossier.types';
import { AssetClient } from '../integrations/asset.client';
import { QualityClient } from '../integrations/quality.client';
import { WmsClient } from '../integrations/wms.client';
import { SavClient } from '../integrations/sav.client';
import { CtoClient } from '../integrations/cto.client';
import { InventoryClient } from '../integrations/inventory.client';
import { randomUUID } from 'crypto';

const DOSSIER_VERSION = '1.0.0';

export class AssetDossierBuilderService {
    private readonly assetClient: AssetClient;
    private readonly qualityClient: QualityClient;
    private readonly wmsClient: WmsClient;
    private readonly savClient: SavClient;
    private readonly ctoClient: CtoClient;
    private readonly inventoryClient: InventoryClient;

    constructor(
        private readonly prisma: PrismaClient,
        clients?: {
            asset?: AssetClient;
            quality?: QualityClient;
            wms?: WmsClient;
            sav?: SavClient;
            cto?: CtoClient;
            inventory?: InventoryClient;
        }
    ) {
        this.assetClient = clients?.asset || new AssetClient();
        this.qualityClient = clients?.quality || new QualityClient();
        this.wmsClient = clients?.wms || new WmsClient();
        this.savClient = clients?.sav || new SavClient();
        this.ctoClient = clients?.cto || new CtoClient();
        this.inventoryClient = clients?.inventory || new InventoryClient();
    }

    /**
     * Construire un dossier machine complet
     * Agrège toutes les données et crée un snapshot figé
     */
    async buildDossier(assetId: string): Promise<AssetDossier> {
        console.log(`[DOSSIER] Building dossier for asset: ${assetId}`);

        // 1. Récupérer l'asset (obligatoire)
        const asset = await this.assetClient.getAsset(assetId);
        if (!asset) {
            throw new AssetNotFoundError(assetId);
        }

        // 2. Collecter toutes les données en parallèle
        const [
            stateHistory,
            qualityResults,
            batteryHealth,
            qualityAlerts,
            wmsTasks,
            savTickets,
            rmas,
            ctoConfig,
            stockLocation,
            movements,
            shipment
        ] = await Promise.all([
            this.assetClient.getStateHistory(assetId),
            this.qualityClient.getQualityResults(assetId),
            this.qualityClient.getBatteryHealth(assetId),
            this.qualityClient.getAlertsForAsset(assetId),
            this.wmsClient.getTasksForAsset(assetId),
            this.savClient.getTicketsForAsset(assetId),
            this.savClient.getRmasForAsset(assetId),
            this.ctoClient.getConfigurationForAsset(assetId),
            this.inventoryClient.getStockLocation(assetId),
            this.inventoryClient.getMovements(assetId),
            this.wmsClient.getShipmentForAsset(assetId)
        ]);

        // 3. Construire les 7 sections
        const snapshotId = randomUUID();
        const now = new Date();

        const meta: DossierMeta = {
            snapshotId,
            assetId,
            generatedAt: now,
            version: DOSSIER_VERSION
        };

        const identity = this.buildIdentity(asset);
        const ctoSection = await this.buildCtoSection(ctoConfig);
        const refurbishment = await this.buildRefurbishmentSection(wmsTasks, qualityResults);
        const quality = this.buildQualitySection(qualityResults, qualityAlerts, batteryHealth);
        const sav = await this.buildSavSection(savTickets, rmas);
        const logistics = await this.buildLogisticsSection(stockLocation, movements, shipment);
        const finalStatus = this.buildFinalStatus(asset, stateHistory);

        const dossier: AssetDossier = {
            meta,
            identity,
            ctoConfiguration: ctoSection,
            refurbishmentHistory: refurbishment,
            qualityIncidents: quality,
            savHistory: sav,
            logistics,
            finalStatus
        };

        // 4. Persister le snapshot (append-only)
        await this.prisma.assetDossierSnapshot.create({
            data: {
                id: snapshotId,
                assetId,
                payload: dossier as any
            }
        });

        console.log(`[DOSSIER] Snapshot created: ${snapshotId}`);
        return dossier;
    }

    /**
     * Récupérer le dernier snapshot existant
     */
    async getLatestDossier(assetId: string): Promise<AssetDossier | null> {
        const snapshot = await this.prisma.assetDossierSnapshot.findFirst({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });

        if (!snapshot) return null;
        return snapshot.payload as unknown as AssetDossier;
    }

    // ============================================
    // SECTION BUILDERS
    // ============================================

    private buildIdentity(asset: any): AssetIdentity {
        return {
            serialNumber: asset.serialNumber,
            assetType: asset.assetType,
            brand: asset.brand,
            model: asset.model,
            chassisRef: asset.chassisRef,
            origin: null, // TODO: Enrichir depuis procurement-service
            entryDate: new Date(asset.createdAt)
        };
    }

    private async buildCtoSection(ctoConfig: any): Promise<CtoConfigurationSection | null> {
        if (!ctoConfig) return null;

        // Récupérer l'audit des décisions
        const audit = await this.ctoClient.getDecisionAudit(ctoConfig.id);

        return {
            configurationId: ctoConfig.id,
            validated: ctoConfig.validated,
            components: Array.isArray(ctoConfig.configuration)
                ? ctoConfig.configuration
                : [],
            decisions: audit?.decisions.map(d => ({
                ruleId: d.ruleId,
                ruleName: d.ruleName,
                ruleVersion: d.ruleVersion,
                result: d.result,
                explanations: d.explanations.map(e => ({
                    code: e.code,
                    message: e.message,
                    severity: e.severity as 'ERROR' | 'WARNING' | 'INFO'
                }))
            })) || [],
            validatedAt: new Date(ctoConfig.createdAt)
        };
    }

    private async buildRefurbishmentSection(
        wmsTasks: any[],
        qualityResults: any[]
    ): Promise<RefurbishmentSection> {
        const tasks: WmsTaskInfo[] = [];

        for (const task of wmsTasks) {
            const steps = await this.wmsClient.getTaskSteps(task.id);
            tasks.push({
                taskId: task.id,
                type: task.type,
                status: task.status,
                // RÈGLE : Anonymisation des opérateurs
                operatorAnonymized: task.operatorId
                    ? `OP-${task.operatorId.substring(0, 4)}`
                    : null,
                steps: steps.map(s => ({
                    description: s.description,
                    completed: s.completed,
                    completedAt: s.completedAt ? new Date(s.completedAt) : null
                })),
                startedAt: task.startedAt ? new Date(task.startedAt) : null,
                completedAt: task.endedAt ? new Date(task.endedAt) : null
            });
        }

        const qaChecklists: QaChecklistResult[] = qualityResults.map(r => ({
            checklistName: 'QA Checklist',
            itemCode: r.checklistItemId,
            result: r.result as 'PASS' | 'FAIL',
            measuredValue: r.measuredValue,
            evaluatedAt: new Date(r.createdAt)
        }));

        return {
            tasks,
            qaChecklists,
            replacedParts: [] // TODO: Enrichir depuis données spécifiques
        };
    }

    private buildQualitySection(
        qualityResults: any[],
        qualityAlerts: any[],
        batteryHealth: any
    ): QualitySection {
        const defects = qualityResults
            .filter(r => r.result === 'FAIL')
            .map(r => ({
                code: r.checklistItemId,
                description: `Quality check failed: ${r.checklistItemId}`,
                severity: 'ERROR',
                detectedAt: new Date(r.createdAt)
            }));

        const alerts = qualityAlerts.map(a => ({
            alertId: a.id,
            type: a.type,
            scope: a.scope,
            reason: a.reason,
            active: a.active,
            createdAt: new Date(a.createdAt)
        }));

        return {
            defects,
            alerts,
            batteryHealth: batteryHealth ? {
                stateOfHealth: batteryHealth.stateOfHealth,
                cycles: batteryHealth.cycles,
                measuredAt: new Date(batteryHealth.measuredAt)
            } : null
        };
    }

    private async buildSavSection(
        tickets: any[],
        rmas: any[]
    ): Promise<SavSection> {
        const ticketInfos = tickets.map(t => ({
            ticketId: t.id,
            customerRef: t.customerRef,
            issue: t.issue,
            status: t.status,
            createdAt: new Date(t.createdAt)
        }));

        const rmaInfos = await Promise.all(rmas.map(async r => {
            const diagnosis = await this.savClient.getDiagnosis(r.id);
            return {
                rmaId: r.id,
                ticketId: r.ticketId,
                status: r.status,
                diagnosis: diagnosis ? {
                    diagnosis: diagnosis.diagnosis,
                    resolution: diagnosis.resolution,
                    createdAt: new Date(diagnosis.createdAt)
                } : null,
                createdAt: new Date(r.createdAt)
            };
        }));

        return {
            tickets: ticketInfos,
            rmas: rmaInfos
        };
    }

    private async buildLogisticsSection(
        stockLocation: any,
        movements: any[],
        shipment: any
    ): Promise<LogisticsSection> {
        let currentWarehouse = null;
        if (stockLocation?.warehouseId) {
            const warehouse = await this.inventoryClient.getWarehouse(stockLocation.warehouseId);
            if (warehouse) {
                currentWarehouse = {
                    warehouseId: warehouse.id,
                    code: warehouse.code,
                    name: warehouse.name,
                    country: warehouse.country
                };
            }
        }

        const movementInfos = movements.map(m => ({
            fromLocation: m.fromLocation,
            toLocation: m.toLocation,
            reason: m.reason,
            movedAt: new Date(m.createdAt)
        }));

        return {
            currentWarehouse,
            movements: movementInfos,
            shipment: shipment ? {
                shipmentId: shipment.id,
                carrier: shipment.carrier,
                trackingRef: shipment.trackingRef,
                status: shipment.status,
                shippedAt: new Date(shipment.createdAt)
            } : null
        };
    }

    private buildFinalStatus(asset: any, stateHistory: any[]): FinalStatusSection {
        // Trouver la justification de scrap si applicable
        let scrapJustification: string | null = null;
        if (asset.status === 'SCRAPPED') {
            const scrapEntry = stateHistory.find(h => h.newStatus === 'SCRAPPED');
            scrapJustification = scrapEntry?.reason || null;
        }

        return {
            status: asset.status,
            grade: asset.grade,
            statusDate: new Date(asset.updatedAt),
            scrapJustification
        };
    }
}
