/**
 * Asset Service
 * Logique métier pour la gestion des Assets
 */

import { PrismaClient, AssetStatus } from '@prisma/client';
import { AssetRepository } from '../repositories/asset.repository';
import { AssetHistoryRepository } from '../repositories/assetHistory.repository';
import { isTransitionAllowed } from '../domain/assetTransitions';
import { emitAssetCreated, emitAssetStatusChanged } from '../events/asset.events';
import {
    CreateAssetDto,
    ChangeStatusDto,
    AssetEntity,
    AssetStateHistoryEntry,
    InvalidTransitionError,
    DuplicateSerialNumberError,
    AssetNotFoundError
} from '../domain/asset.types';

export class AssetService {
    private readonly assetRepository: AssetRepository;
    private readonly historyRepository: AssetHistoryRepository;

    constructor(prisma: PrismaClient) {
        this.assetRepository = new AssetRepository(prisma);
        this.historyRepository = new AssetHistoryRepository(prisma);
    }

    /**
     * Crée un nouvel asset
     * 
     * - Statut forcé à ACQUIRED
     * - Création automatique de l'historique
     * - Émission événement AssetCreated
     * 
     * @throws DuplicateSerialNumberError si le numéro de série existe déjà
     */
    async createAsset(dto: CreateAssetDto): Promise<AssetEntity> {
        // Vérifier l'unicité du numéro de série
        const existing = await this.assetRepository.findBySerialNumber(dto.serialNumber);
        if (existing) {
            throw new DuplicateSerialNumberError(dto.serialNumber);
        }

        // Créer l'asset avec statut initial ACQUIRED
        const asset = await this.assetRepository.create(dto);

        // Créer l'entrée d'historique initiale
        await this.historyRepository.create(
            asset.id,
            null, // Pas de statut précédent
            AssetStatus.ACQUIRED,
            'Initial acquisition'
        );

        // Émettre l'événement de création
        emitAssetCreated(asset);

        return asset;
    }

    /**
     * Change le statut d'un asset
     * 
     * - Vérifie que la transition est autorisée
     * - Enregistre l'historique
     * - Met à jour l'asset
     * - Émet AssetStatusChanged
     * 
     * @throws AssetNotFoundError si l'asset n'existe pas
     * @throws InvalidTransitionError si la transition n'est pas autorisée
     */
    async changeStatus(assetId: string, dto: ChangeStatusDto): Promise<AssetEntity> {
        // Récupérer l'asset
        const asset = await this.assetRepository.findById(assetId);
        if (!asset) {
            throw new AssetNotFoundError(assetId);
        }

        const currentStatus = asset.status;
        const { newStatus, reason } = dto;

        // Vérifier que la transition est autorisée
        if (!isTransitionAllowed(currentStatus, newStatus)) {
            throw new InvalidTransitionError(currentStatus, newStatus);
        }

        // Mettre à jour le statut
        const updatedAsset = await this.assetRepository.updateStatus(assetId, newStatus);

        // Enregistrer dans l'historique
        await this.historyRepository.create(
            assetId,
            currentStatus,
            newStatus,
            reason
        );

        // Émettre l'événement
        emitAssetStatusChanged(updatedAsset, currentStatus, reason);

        return updatedAsset;
    }

    /**
     * Récupère un asset par ID
     * 
     * @throws AssetNotFoundError si l'asset n'existe pas
     */
    async getAsset(assetId: string): Promise<AssetEntity> {
        const asset = await this.assetRepository.findById(assetId);
        if (!asset) {
            throw new AssetNotFoundError(assetId);
        }
        return asset;
    }

    /**
     * Récupère l'historique d'un asset
     */
    async getAssetHistory(assetId: string): Promise<AssetStateHistoryEntry[]> {
        // Vérifier que l'asset existe
        const asset = await this.assetRepository.findById(assetId);
        if (!asset) {
            throw new AssetNotFoundError(assetId);
        }

        return this.historyRepository.findByAssetId(assetId);
    }

    /**
     * Liste tous les assets
     */
    async listAssets(limit?: number, offset?: number): Promise<AssetEntity[]> {
        return this.assetRepository.findAll(limit, offset);
    }
}
