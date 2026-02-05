/**
 * Quality Service
 * Logique métier pour la gestion qualité et reconditionnement
 */

import { PrismaClient, AssetType } from '@prisma/client';
import { ChecklistRepository } from '../repositories/checklist.repository';
import { ChecklistItemRepository } from '../repositories/checklistItem.repository';
import { QualityResultRepository } from '../repositories/qualityResult.repository';
import { BatteryRepository } from '../repositories/battery.repository';
import { AssetServiceClient, HttpAssetServiceClient } from '../integrations/asset.client';
import {
    emitQualityResultRecorded,
    emitBatteryHealthRecorded,
    emitQualityPassed,
    emitQualityFailed
} from '../events/quality.events';
import {
    CreateChecklistDto,
    ChecklistEntity,
    ChecklistNotFoundError,
    DuplicateChecklistError
} from '../domain/checklist.types';
import {
    RecordQualityResultDto,
    QualityResultEntity,
    ValidationResult,
    InvalidAssetStatusError,
    QualityResultAlreadyExistsError,
    QualityValidationFailedError
} from '../domain/qualityResult.types';
import {
    RecordBatteryHealthDto,
    BatteryHealthEntity,
    InvalidStateOfHealthError,
    BATTERY_SOH_THRESHOLD
} from '../domain/battery.types';

export class QualityService {
    private readonly checklistRepository: ChecklistRepository;
    private readonly checklistItemRepository: ChecklistItemRepository;
    private readonly qualityResultRepository: QualityResultRepository;
    private readonly batteryRepository: BatteryRepository;
    private readonly assetServiceClient: AssetServiceClient;

    constructor(prisma: PrismaClient, assetServiceClient?: AssetServiceClient) {
        this.checklistRepository = new ChecklistRepository(prisma);
        this.checklistItemRepository = new ChecklistItemRepository(prisma);
        this.qualityResultRepository = new QualityResultRepository(prisma);
        this.batteryRepository = new BatteryRepository(prisma);
        this.assetServiceClient = assetServiceClient ?? new HttpAssetServiceClient();
    }

    /**
     * Crée une checklist qualité
     * 
     * Règles :
     * - (name, assetType, version) doit être unique
     * - items >= 1
     */
    async createChecklist(dto: CreateChecklistDto): Promise<ChecklistEntity> {
        // Vérifier unicité
        const exists = await this.checklistRepository.exists(dto.name, dto.assetType, dto.version);
        if (exists) {
            throw new DuplicateChecklistError(dto.name, dto.assetType, dto.version);
        }

        // Vérifier qu'il y a au moins un item
        if (!dto.items || dto.items.length === 0) {
            throw new Error('Checklist must have at least one item');
        }

        return this.checklistRepository.create(dto);
    }

    /**
     * Enregistre un résultat de test qualité
     * 
     * Règles STRICTES :
     * - L'Asset doit être en QUALITY_PENDING
     * - Un item ne peut être testé qu'une seule fois
     * - Aucun update autorisé (append-only)
     */
    async recordQualityResult(
        assetId: string,
        dto: RecordQualityResultDto
    ): Promise<QualityResultEntity> {
        // Vérifier le statut de l'asset
        const asset = await this.assetServiceClient.getAsset(assetId);
        if (asset.status !== 'QUALITY_PENDING') {
            throw new InvalidAssetStatusError(assetId, asset.status, 'QUALITY_PENDING');
        }

        // Vérifier que le résultat n'existe pas déjà (append-only)
        const exists = await this.qualityResultRepository.exists(assetId, dto.checklistItemId);
        if (exists) {
            throw new QualityResultAlreadyExistsError(assetId, dto.checklistItemId);
        }

        // Créer le résultat
        const result = await this.qualityResultRepository.create(assetId, dto);

        // Émettre l'événement
        emitQualityResultRecorded(result);

        return result;
    }

    /**
     * Enregistre la santé batterie
     * 
     * Règles STRICTES :
     * - stateOfHealth ∈ [0,100]
     * - Une seule mesure active (nouvelle mesure écrase la précédente)
     */
    async recordBatteryHealth(
        assetId: string,
        dto: RecordBatteryHealthDto
    ): Promise<BatteryHealthEntity> {
        // Valider le stateOfHealth
        if (dto.stateOfHealth < 0 || dto.stateOfHealth > 100) {
            throw new InvalidStateOfHealthError(dto.stateOfHealth);
        }

        // Upsert (écrase la précédente mesure)
        const battery = await this.batteryRepository.upsert(assetId, dto);

        // Émettre l'événement
        emitBatteryHealthRecorded(battery);

        return battery;
    }

    /**
     * Valide la qualité globale d'un asset
     * 
     * Étapes STRICTES (dans cet ordre) :
     * 1. Charger la checklist correspondant à l'AssetType
     * 2. Vérifier que tous les items ont un résultat
     * 3. Vérifier qu'aucun item bloquant n'est en FAIL
     * 4. Vérifier batterie : si SoH < 85 → REFUS
     * 5. Si tout OK → appeler Asset Service → statut SELLABLE
     * 6. Sinon → refuser explicitement
     */
    async validateQuality(assetId: string): Promise<ValidationResult> {
        // Récupérer l'asset pour connaître son type
        const asset = await this.assetServiceClient.getAsset(assetId);
        const assetType = asset.assetType as AssetType;

        // 1. Charger la checklist correspondante (version la plus récente)
        const checklist = await this.checklistRepository.findLatestByAssetType(assetType);
        if (!checklist || !checklist.items) {
            throw new ChecklistNotFoundError(undefined, assetType);
        }

        // 2. Récupérer tous les résultats pour cet asset
        const results = await this.qualityResultRepository.findByAssetId(assetId);
        const resultMap = new Map(results.map(r => [r.checklistItemId, r]));

        // Vérifier que tous les items ont un résultat
        const missingItems: string[] = [];
        const blockingFailures: string[] = [];

        for (const item of checklist.items) {
            const result = resultMap.get(item.id);

            if (!result) {
                missingItems.push(item.code);
            } else if (result.result === 'FAIL' && item.isBlocking) {
                blockingFailures.push(item.code);
            }
        }

        const checklistComplete = missingItems.length === 0;

        // 4. Vérifier la batterie (pour LAPTOP uniquement, ou tous les types avec batterie)
        const battery = await this.batteryRepository.findByAssetId(assetId);
        let batteryOk = true;
        let batteryStateOfHealth: number | undefined;

        // La batterie n'est requise que pour les LAPTOP
        if (assetType === 'LAPTOP') {
            if (!battery) {
                batteryOk = false;
            } else {
                batteryStateOfHealth = battery.stateOfHealth;
                batteryOk = battery.stateOfHealth >= BATTERY_SOH_THRESHOLD;
            }
        } else if (battery) {
            // Si une batterie est enregistrée pour un autre type, on vérifie quand même
            batteryStateOfHealth = battery.stateOfHealth;
            batteryOk = battery.stateOfHealth >= BATTERY_SOH_THRESHOLD;
        }

        // Construire le résultat de validation
        const validationResult: ValidationResult = {
            isValid: checklistComplete && blockingFailures.length === 0 && batteryOk,
            details: {
                checklistComplete,
                missingItems,
                blockingFailures,
                batteryOk,
                batteryStateOfHealth
            }
        };

        // Déterminer la raison en cas d'échec
        if (!validationResult.isValid) {
            if (!checklistComplete) {
                validationResult.reason = `Incomplete checklist: missing ${missingItems.join(', ')}`;
            } else if (blockingFailures.length > 0) {
                validationResult.reason = `Blocking items failed: ${blockingFailures.join(', ')}`;
            } else if (!batteryOk) {
                validationResult.reason = battery
                    ? `Battery SoH ${battery.stateOfHealth}% below threshold ${BATTERY_SOH_THRESHOLD}%`
                    : 'Battery health measurement required';
            }

            // Émettre l'événement d'échec
            emitQualityFailed(assetId, validationResult.reason ?? 'Unknown', validationResult.details);

            throw new QualityValidationFailedError(assetId, validationResult);
        }

        // 5. Tout est OK → changer le statut vers SELLABLE
        await this.assetServiceClient.changeStatus(assetId, 'SELLABLE', 'Quality validation passed');

        // Émettre l'événement de succès
        emitQualityPassed(assetId, checklist.id, batteryStateOfHealth);

        return validationResult;
    }

    /**
     * Récupère une checklist par ID
     */
    async getChecklist(checklistId: string): Promise<ChecklistEntity> {
        const checklist = await this.checklistRepository.findById(checklistId);
        if (!checklist) {
            throw new ChecklistNotFoundError(checklistId);
        }
        return checklist;
    }

    /**
     * Liste toutes les checklists
     */
    async listChecklists(): Promise<ChecklistEntity[]> {
        return this.checklistRepository.findAll();
    }

    /**
     * Récupère les résultats qualité d'un asset
     */
    async getQualityResults(assetId: string): Promise<QualityResultEntity[]> {
        return this.qualityResultRepository.findByAssetId(assetId);
    }

    /**
     * Récupère la santé batterie d'un asset
     */
    async getBatteryHealth(assetId: string): Promise<BatteryHealthEntity | null> {
        return this.batteryRepository.findByAssetId(assetId);
    }
}
