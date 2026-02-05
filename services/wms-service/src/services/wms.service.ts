/**
 * WMS Service
 * Logique métier pour l'exécution opérationnelle WMS
 * 
 * PHILOSOPHIE : Le WMS exécute des ordres, il ne raisonne pas.
 */

import { PrismaClient, PickingStatus, AssemblyStatus, ShipmentStatus } from '@prisma/client';
import { PickingRepository } from '../repositories/picking.repository';
import { AssemblyRepository } from '../repositories/assembly.repository';
import { ShipmentRepository } from '../repositories/shipment.repository';
import { ReturnRepository } from '../repositories/return.repository';
import {
    InventoryServiceClient,
    HttpInventoryServiceClient
} from '../integrations/inventory.client';
import {
    AssetServiceClient,
    HttpAssetServiceClient
} from '../integrations/asset.client';
import {
    emitPickingCreated,
    emitPickingCompleted,
    emitAssemblyCompleted,
    emitAssetShipped,
    emitAssetReturned
} from '../events/wms.events';
import {
    CreatePickingOrderDto,
    PickingOrderEntity,
    AssetNotReservedForPickingError,
    PickingOrderNotFoundError,
    PickingAlreadyExistsError,
    InvalidPickingStatusError
} from '../domain/picking.types';
import {
    CreateAssemblyOrderDto,
    AssemblyOrderEntity,
    AssemblyOrderNotFoundError,
    EmptyAssemblyTasksError,
    InvalidAssemblyStatusError
} from '../domain/assembly.types';
import {
    CreateShipmentDto,
    ShipmentEntity,
    PickingNotCompletedError,
    AssemblyNotCompletedError
} from '../domain/shipment.types';
import {
    CreateReturnDto,
    ReturnEntity
} from '../domain/return.types';

// Emplacement par défaut pour les mouvements (simplifié pour Sprint 5)
const SHIPPING_LOCATION = 'SHIPPING_DOCK';
const RECEIVING_LOCATION = 'RECEIVING_DOCK';

export class WmsService {
    private readonly pickingRepository: PickingRepository;
    private readonly assemblyRepository: AssemblyRepository;
    private readonly shipmentRepository: ShipmentRepository;
    private readonly returnRepository: ReturnRepository;
    private readonly inventoryClient: InventoryServiceClient;
    private readonly assetClient: AssetServiceClient;

    constructor(
        prisma: PrismaClient,
        inventoryClient?: InventoryServiceClient,
        assetClient?: AssetServiceClient
    ) {
        this.pickingRepository = new PickingRepository(prisma);
        this.assemblyRepository = new AssemblyRepository(prisma);
        this.shipmentRepository = new ShipmentRepository(prisma);
        this.returnRepository = new ReturnRepository(prisma);
        this.inventoryClient = inventoryClient ?? new HttpInventoryServiceClient();
        this.assetClient = assetClient ?? new HttpAssetServiceClient();
    }

    // ========== PICKING ==========

    /**
     * Crée un ordre de picking
     * 
     * Étapes STRICTES :
     * 1. Vérifier Asset réservé
     * 2. Créer PickingOrder → PENDING
     * 3. Émettre événement PickingCreated
     */
    async createPickingOrder(dto: CreatePickingOrderDto): Promise<PickingOrderEntity> {
        // 1. Vérifier que l'asset est réservé
        const reservation = await this.inventoryClient.getReservation(dto.assetId);
        if (!reservation) {
            throw new AssetNotReservedForPickingError(dto.assetId);
        }

        // Vérifier qu'il n'y a pas déjà un picking actif
        const existingPicking = await this.pickingRepository.findActiveByAssetId(dto.assetId);
        if (existingPicking) {
            throw new PickingAlreadyExistsError(dto.assetId);
        }

        // 2. Créer l'ordre de picking
        const picking = await this.pickingRepository.create(dto.assetId);

        // 3. Émettre l'événement
        emitPickingCreated(picking);

        return picking;
    }

    /**
     * Démarre un picking
     */
    async startPicking(pickingId: string): Promise<PickingOrderEntity> {
        const picking = await this.pickingRepository.findById(pickingId);
        if (!picking) {
            throw new PickingOrderNotFoundError(pickingId);
        }

        if (picking.status !== PickingStatus.PENDING) {
            throw new InvalidPickingStatusError(pickingId, picking.status, PickingStatus.PENDING);
        }

        return this.pickingRepository.updateStatus(pickingId, PickingStatus.IN_PROGRESS);
    }

    /**
     * Complète un picking
     * 
     * Règles :
     * - passage IN_PROGRESS → COMPLETED
     * - mouvement Inventory obligatoire
     */
    async completePicking(pickingId: string): Promise<PickingOrderEntity> {
        const picking = await this.pickingRepository.findById(pickingId);
        if (!picking) {
            throw new PickingOrderNotFoundError(pickingId);
        }

        // Permettre de compléter depuis PENDING ou IN_PROGRESS
        if (picking.status === PickingStatus.COMPLETED) {
            return picking;
        }

        if (picking.status === PickingStatus.FAILED) {
            throw new InvalidPickingStatusError(pickingId, picking.status, PickingStatus.IN_PROGRESS);
        }

        // Mouvement Inventory vers zone d'expédition (MOVE)
        await this.inventoryClient.moveAsset(picking.assetId, SHIPPING_LOCATION, 'MOVE');

        // Mettre à jour le statut
        const completedPicking = await this.pickingRepository.updateStatus(
            pickingId,
            PickingStatus.COMPLETED
        );

        // Émettre l'événement
        emitPickingCompleted(completedPicking);

        return completedPicking;
    }

    /**
     * Récupère un picking par ID
     */
    async getPickingOrder(pickingId: string): Promise<PickingOrderEntity> {
        const picking = await this.pickingRepository.findById(pickingId);
        if (!picking) {
            throw new PickingOrderNotFoundError(pickingId);
        }
        return picking;
    }

    // ========== ASSEMBLY ==========

    /**
     * Crée un ordre d'assemblage
     * 
     * Règles :
     * - ordre fourni par CTO (Sprint 6)
     * - WMS ne modifie pas les tâches
     */
    async createAssemblyOrder(dto: CreateAssemblyOrderDto): Promise<AssemblyOrderEntity> {
        if (!dto.tasks || dto.tasks.length === 0) {
            throw new EmptyAssemblyTasksError();
        }

        const assembly = await this.assemblyRepository.create(dto.assetId, dto.tasks);
        return assembly;
    }

    /**
     * Démarre un assemblage
     */
    async startAssembly(assemblyId: string): Promise<AssemblyOrderEntity> {
        const assembly = await this.assemblyRepository.findById(assemblyId);
        if (!assembly) {
            throw new AssemblyOrderNotFoundError(assemblyId);
        }

        if (assembly.status !== AssemblyStatus.PENDING) {
            throw new InvalidAssemblyStatusError(assemblyId, assembly.status, AssemblyStatus.PENDING);
        }

        return this.assemblyRepository.updateStatus(assemblyId, AssemblyStatus.IN_PROGRESS);
    }

    /**
     * Complète un assemblage
     * 
     * Règles :
     * - toutes les tâches considérées exécutées
     * - statut COMPLETED
     */
    async completeAssembly(assemblyId: string): Promise<AssemblyOrderEntity> {
        const assembly = await this.assemblyRepository.findById(assemblyId);
        if (!assembly) {
            throw new AssemblyOrderNotFoundError(assemblyId);
        }

        if (assembly.status === AssemblyStatus.COMPLETED) {
            return assembly;
        }

        if (assembly.status === AssemblyStatus.FAILED) {
            throw new InvalidAssemblyStatusError(assemblyId, assembly.status, AssemblyStatus.IN_PROGRESS);
        }

        // Mettre à jour le statut
        const completedAssembly = await this.assemblyRepository.updateStatus(
            assemblyId,
            AssemblyStatus.COMPLETED
        );

        // Émettre l'événement
        emitAssemblyCompleted(completedAssembly);

        return completedAssembly;
    }

    /**
     * Récupère un assemblage par ID
     */
    async getAssemblyOrder(assemblyId: string): Promise<AssemblyOrderEntity> {
        const assembly = await this.assemblyRepository.findById(assemblyId);
        if (!assembly) {
            throw new AssemblyOrderNotFoundError(assemblyId);
        }
        return assembly;
    }

    // ========== SHIPMENT ==========

    /**
     * Crée une expédition
     * 
     * Étapes STRICTES :
     * 1. Vérifier picking complété
     * 2. Vérifier assemblage complété (si existant)
     * 3. Créer Shipment
     * 4. Mouvement Inventory SHIP
     * 5. Appel Asset Service → statut SOLD
     * 6. Émettre événement AssetShipped
     */
    async createShipment(dto: CreateShipmentDto): Promise<ShipmentEntity> {
        // 1. Vérifier picking complété
        const completedPicking = await this.pickingRepository.findCompletedByAssetId(dto.assetId);
        if (!completedPicking) {
            throw new PickingNotCompletedError(dto.assetId);
        }

        // 2. Vérifier assemblage complété (si un assemblage existe)
        const activeAssembly = await this.assemblyRepository.findActiveByAssetId(dto.assetId);
        if (activeAssembly) {
            // Il y a un assemblage actif non complété
            throw new AssemblyNotCompletedError(dto.assetId);
        }

        // 3. Créer l'expédition
        const shipment = await this.shipmentRepository.create(dto.assetId, dto.carrier);

        // 4. Mouvement Inventory SHIP
        await this.inventoryClient.moveAsset(dto.assetId, SHIPPING_LOCATION, 'SHIP');

        // 5. Changer le statut Asset → SOLD
        await this.assetClient.changeStatus(dto.assetId, 'SOLD', 'Shipped via WMS');

        // 6. Mettre à jour le statut de l'expédition
        const shippedShipment = await this.shipmentRepository.update(shipment.id, {
            status: ShipmentStatus.SHIPPED
        });

        // Émettre l'événement
        emitAssetShipped(shippedShipment);

        return shippedShipment;
    }

    /**
     * Récupère une expédition par ID
     */
    async getShipment(shipmentId: string): Promise<ShipmentEntity | null> {
        return this.shipmentRepository.findById(shipmentId);
    }

    // ========== RETURNS ==========

    /**
     * Traite un retour (RMA logistique)
     * 
     * Étapes STRICTES :
     * 1. Appel Asset Service → statut RMA
     * 2. Mouvement Inventory RETURN
     * 3. Création Return → RECEIVED
     * 4. Émettre événement AssetReturned
     */
    async processReturn(dto: CreateReturnDto): Promise<ReturnEntity> {
        // 1. Changer le statut Asset → RMA
        await this.assetClient.changeStatus(dto.assetId, 'RMA', `Return: ${dto.reason}`);

        // 2. Mouvement Inventory RETURN
        await this.inventoryClient.moveAsset(dto.assetId, RECEIVING_LOCATION, 'RETURN');

        // 3. Créer le retour
        const ret = await this.returnRepository.create(dto.assetId, dto.reason);

        // 4. Émettre l'événement
        emitAssetReturned(ret);

        return ret;
    }

    /**
     * Récupère un retour par ID
     */
    async getReturn(returnId: string): Promise<ReturnEntity | null> {
        return this.returnRepository.findById(returnId);
    }

    /**
     * Récupère les retours d'un asset
     */
    async getReturnsByAssetId(assetId: string): Promise<ReturnEntity[]> {
        return this.returnRepository.findByAssetId(assetId);
    }
}
