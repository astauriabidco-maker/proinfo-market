/**
 * Inventory Service
 * Logique métier pour la gestion du stock sérialisé
 */

import { PrismaClient, MovementReason } from '@prisma/client';
import { WarehouseRepository } from '../repositories/warehouse.repository';
import { LocationRepository } from '../repositories/location.repository';
import { MovementRepository } from '../repositories/movement.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { AssetServiceClient, HttpAssetServiceClient } from '../integrations/asset.client';
import {
    emitAssetMoved,
    emitAssetReserved,
    emitAssetReservationReleased
} from '../events/inventory.events';
import {
    CreateWarehouseDto,
    CreateLocationDto,
    WarehouseEntity,
    LocationEntity,
    WarehouseNotFoundError,
    LocationNotFoundError,
    DuplicateLocationError
} from '../domain/location.types';
import {
    MoveAssetDto,
    MovementEntity,
    AssetPosition,
    MissingToLocationError
} from '../domain/movement.types';
import {
    ReserveAssetDto,
    ReservationEntity,
    AvailabilityResult,
    AssetAlreadyReservedError,
    AssetNotReservedError,
    AssetNotSellableError
} from '../domain/reservation.types';

export class InventoryService {
    private readonly warehouseRepository: WarehouseRepository;
    private readonly locationRepository: LocationRepository;
    private readonly movementRepository: MovementRepository;
    private readonly reservationRepository: ReservationRepository;
    private readonly assetServiceClient: AssetServiceClient;

    constructor(prisma: PrismaClient, assetServiceClient?: AssetServiceClient) {
        this.warehouseRepository = new WarehouseRepository(prisma);
        this.locationRepository = new LocationRepository(prisma);
        this.movementRepository = new MovementRepository(prisma);
        this.reservationRepository = new ReservationRepository(prisma);
        this.assetServiceClient = assetServiceClient ?? new HttpAssetServiceClient();
    }

    // ========== WAREHOUSE & LOCATIONS ==========

    /**
     * Crée un nouvel entrepôt
     */
    async createWarehouse(dto: CreateWarehouseDto): Promise<WarehouseEntity> {
        return this.warehouseRepository.create(dto);
    }

    /**
     * Récupère un entrepôt par ID
     */
    async getWarehouse(warehouseId: string): Promise<WarehouseEntity> {
        const warehouse = await this.warehouseRepository.findById(warehouseId);
        if (!warehouse) {
            throw new WarehouseNotFoundError(warehouseId);
        }
        return warehouse;
    }

    /**
     * Liste tous les entrepôts
     */
    async listWarehouses(): Promise<WarehouseEntity[]> {
        return this.warehouseRepository.findAll();
    }

    /**
     * Crée un emplacement dans un entrepôt
     */
    async createLocation(warehouseId: string, dto: CreateLocationDto): Promise<LocationEntity> {
        // Vérifier que l'entrepôt existe
        const warehouse = await this.warehouseRepository.findById(warehouseId);
        if (!warehouse) {
            throw new WarehouseNotFoundError(warehouseId);
        }

        // Vérifier unicité (warehouseId, code)
        const exists = await this.locationRepository.exists(warehouseId, dto.code);
        if (exists) {
            throw new DuplicateLocationError(warehouseId, dto.code);
        }

        return this.locationRepository.create(warehouseId, dto);
    }

    /**
     * Liste les emplacements d'un entrepôt
     */
    async listLocations(warehouseId: string): Promise<LocationEntity[]> {
        return this.locationRepository.findByWarehouseId(warehouseId);
    }

    // ========== MOVEMENTS ==========

    /**
     * Déplace un asset vers un emplacement
     * 
     * Règles STRICTES :
     * - toLocation obligatoire
     * - Un asset n'a qu'un seul emplacement courant
     * - Chaque déplacement = 1 mouvement append-only
     */
    async moveAsset(assetId: string, dto: MoveAssetDto): Promise<MovementEntity> {
        // Vérifier que toLocation est fourni
        if (!dto.toLocation) {
            throw new MissingToLocationError();
        }

        // Vérifier que l'emplacement destination existe
        const toLocation = await this.locationRepository.findById(dto.toLocation);
        if (!toLocation) {
            throw new LocationNotFoundError(dto.toLocation);
        }

        // Vérifier l'emplacement source si fourni
        if (dto.fromLocation) {
            const fromLocation = await this.locationRepository.findById(dto.fromLocation);
            if (!fromLocation) {
                throw new LocationNotFoundError(dto.fromLocation);
            }
        }

        // Créer le mouvement (append-only)
        const movement = await this.movementRepository.create(
            assetId,
            dto.fromLocation ?? null,
            dto.toLocation,
            dto.reason
        );

        // Émettre l'événement
        emitAssetMoved(movement);

        return movement;
    }

    /**
     * Récupère l'historique des mouvements d'un asset
     */
    async getMovementHistory(assetId: string): Promise<MovementEntity[]> {
        return this.movementRepository.findByAssetId(assetId);
    }

    /**
     * Récupère la position courante d'un asset
     */
    async getCurrentPosition(assetId: string): Promise<AssetPosition> {
        const position = await this.movementRepository.getCurrentPosition(assetId);

        // Enrichir avec le code de l'emplacement si disponible
        if (position.locationId) {
            const location = await this.locationRepository.findById(position.locationId);
            if (location) {
                position.locationCode = location.code;
            }
        }

        return position;
    }

    // ========== RESERVATIONS ==========

    /**
     * Réserve un asset pour une commande
     * 
     * Étapes STRICTES :
     * 1. Vérifier statut Asset = SELLABLE
     * 2. Créer InventoryReservation de manière ATOMIQUE (transaction Serializable)
     * 3. Créer mouvement RESERVE
     * 4. Émettre événement AssetReserved
     * 
     * POINT BLOQUANT AUDIT #2 : Utilise transaction atomique pour éviter race conditions
     */
    async reserveAsset(assetId: string, dto: ReserveAssetDto): Promise<ReservationEntity> {
        // 1. Vérifier le statut de l'asset
        const asset = await this.assetServiceClient.getAsset(assetId);
        if (asset.status !== 'SELLABLE') {
            throw new AssetNotSellableError(assetId, asset.status);
        }

        // 2. Créer la réservation de manière ATOMIQUE
        // La méthode createAtomic utilise une transaction Serializable
        // qui garantit qu'aucun autre processus ne peut réserver le même asset
        const reservation = await this.reservationRepository.createAtomic(assetId, dto.orderRef);

        // 3. Créer le mouvement RESERVE
        const position = await this.movementRepository.getCurrentPosition(assetId);
        await this.movementRepository.create(
            assetId,
            position.locationId,
            position.locationId, // Pas de changement d'emplacement
            MovementReason.RESERVE
        );

        // 4. Émettre l'événement
        emitAssetReserved(reservation);

        return reservation;
    }


    /**
     * Libère une réservation
     * 
     * Règles :
     * - Réservation obligatoire
     * - Suppression réservation
     * - Mouvement RELEASE
     */
    async releaseReservation(assetId: string): Promise<void> {
        // Vérifier qu'une réservation existe
        const reservation = await this.reservationRepository.findByAssetId(assetId);
        if (!reservation) {
            throw new AssetNotReservedError(assetId);
        }

        // Créer le mouvement RELEASE
        const position = await this.movementRepository.getCurrentPosition(assetId);
        await this.movementRepository.create(
            assetId,
            position.locationId,
            position.locationId, // Pas de changement d'emplacement
            MovementReason.RELEASE
        );

        // Supprimer la réservation
        await this.reservationRepository.delete(assetId);

        // Émettre l'événement
        emitAssetReservationReleased(assetId, reservation.orderRef);
    }

    /**
     * Récupère la réservation d'un asset
     */
    async getReservation(assetId: string): Promise<ReservationEntity | null> {
        return this.reservationRepository.findByAssetId(assetId);
    }

    // ========== AVAILABILITY ==========

    /**
     * Calcule la disponibilité d'un asset
     * 
     * Disponible si :
     * - Asset SELLABLE
     * - Pas de réservation active
     * - Emplacement connu
     */
    async checkAvailability(assetId: string): Promise<AvailabilityResult> {
        // Vérifier le statut de l'asset
        let assetStatus: string;
        try {
            const asset = await this.assetServiceClient.getAsset(assetId);
            assetStatus = asset.status;
        } catch (error) {
            return {
                available: false,
                location: null,
                reason: 'Asset not found or service unavailable'
            };
        }

        // Vérifier si SELLABLE
        if (assetStatus !== 'SELLABLE') {
            return {
                available: false,
                location: null,
                reason: `Asset status is ${assetStatus}, not SELLABLE`
            };
        }

        // Vérifier s'il est réservé
        const reservation = await this.reservationRepository.findByAssetId(assetId);
        if (reservation) {
            return {
                available: false,
                location: null,
                reason: `Asset reserved for order ${reservation.orderRef}`
            };
        }

        // Vérifier l'emplacement
        const position = await this.movementRepository.getCurrentPosition(assetId);
        if (!position.locationId) {
            return {
                available: false,
                location: null,
                reason: 'Asset has no known location'
            };
        }

        // Récupérer le code de l'emplacement
        const location = await this.locationRepository.findById(position.locationId);
        const locationCode = location?.code ?? position.locationId;

        return {
            available: true,
            location: locationCode
        };
    }
}
