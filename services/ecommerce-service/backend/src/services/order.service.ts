/**
 * Order Service
 * Logique métier pour la création de commandes
 * 
 * ORCHESTRATEUR : Le e-commerce ne pense pas, il orchestre.
 */

import { v4 as uuidv4 } from 'uuid';
import {
    InventoryServiceClient,
    HttpInventoryServiceClient,
    AvailabilityResponse
} from '../integrations/inventory.client';
import {
    CtoServiceClient,
    HttpCtoServiceClient,
    CtoConfigurationResponse,
    PriceSnapshot
} from '../integrations/cto.client';

/**
 * DTO pour créer une commande
 */
export interface CreateOrderDto {
    assetId: string;
    ctoConfigurationId: string;
    customerRef: string;
}

/**
 * Entité Commande
 */
export interface OrderEntity {
    id: string;
    assetId: string;
    ctoConfigurationId: string;
    customerRef: string;
    priceSnapshot: PriceSnapshot;
    leadTimeDays: number;
    status: OrderStatus;
    reservationId?: string;
    createdAt: Date;
}

export enum OrderStatus {
    PENDING = 'PENDING',
    RESERVED = 'RESERVED',
    CONFIRMED = 'CONFIRMED',
    FAILED = 'FAILED'
}

/**
 * Erreur : Configuration CTO non validée
 */
export class CtoNotValidatedError extends Error {
    constructor(public readonly configurationId: string) {
        super(`CTO configuration ${configurationId} is not validated`);
        this.name = 'CtoNotValidatedError';
    }
}

/**
 * Erreur : Asset non disponible
 */
export class AssetNotAvailableError extends Error {
    constructor(public readonly assetId: string) {
        super(`Asset ${assetId} is not available`);
        this.name = 'AssetNotAvailableError';
    }
}

/**
 * Erreur : Réservation échouée
 */
export class ReservationFailedError extends Error {
    constructor(
        public readonly assetId: string,
        public readonly reason: string
    ) {
        super(`Reservation failed for asset ${assetId}: ${reason}`);
        this.name = 'ReservationFailedError';
    }
}

/**
 * Événements
 */
export interface OrderCreatedEvent {
    eventType: 'OrderCreated';
    version: '1.0';
    timestamp: Date;
    payload: {
        orderId: string;
        assetId: string;
        customerRef: string;
        priceTotal: number;
    };
}

export interface OrderReservationConfirmedEvent {
    eventType: 'OrderReservationConfirmed';
    version: '1.0';
    timestamp: Date;
    payload: {
        orderId: string;
        assetId: string;
        reservationId: string;
    };
}

function emitOrderCreated(order: OrderEntity): void {
    const event: OrderCreatedEvent = {
        eventType: 'OrderCreated',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            orderId: order.id,
            assetId: order.assetId,
            customerRef: order.customerRef,
            priceTotal: order.priceSnapshot.total
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

function emitOrderReservationConfirmed(order: OrderEntity): void {
    const event: OrderReservationConfirmedEvent = {
        eventType: 'OrderReservationConfirmed',
        version: '1.0',
        timestamp: new Date(),
        payload: {
            orderId: order.id,
            assetId: order.assetId,
            reservationId: order.reservationId ?? ''
        }
    };
    console.log('[EVENT]', JSON.stringify(event, null, 2));
}

export class OrderService {
    private readonly inventoryClient: InventoryServiceClient;
    private readonly ctoClient: CtoServiceClient;

    // Stockage en mémoire (simplifié pour Sprint 7)
    private readonly orders: Map<string, OrderEntity> = new Map();

    constructor(
        inventoryClient?: InventoryServiceClient,
        ctoClient?: CtoServiceClient
    ) {
        this.inventoryClient = inventoryClient ?? new HttpInventoryServiceClient();
        this.ctoClient = ctoClient ?? new HttpCtoServiceClient();
    }

    /**
     * Crée une commande
     * 
     * Étapes STRICTES :
     * 1. Vérifier CTO validé
     * 2. Vérifier disponibilité Inventory
     * 3. Réserver Asset
     * 4. Créer commande interne
     * 5. Retourner confirmation
     */
    async createOrder(dto: CreateOrderDto): Promise<OrderEntity> {
        // 1. Vérifier CTO validé
        const ctoConfig = await this.ctoClient.getConfiguration(dto.ctoConfigurationId);
        if (!ctoConfig.validated) {
            throw new CtoNotValidatedError(dto.ctoConfigurationId);
        }

        // Vérifier que l'assetId correspond
        if (ctoConfig.assetId !== dto.assetId) {
            throw new CtoNotValidatedError(dto.ctoConfigurationId);
        }

        // 2. Vérifier disponibilité Inventory
        const availability = await this.inventoryClient.checkAvailability(dto.assetId);
        if (!availability.available) {
            throw new AssetNotAvailableError(dto.assetId);
        }

        // Créer l'ID de commande
        const orderId = uuidv4();

        // 3. Réserver Asset
        let reservationId: string;
        try {
            const reservation = await this.inventoryClient.reserveAsset(dto.assetId, orderId);
            reservationId = reservation.id;
        } catch (error) {
            throw new ReservationFailedError(
                dto.assetId,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }

        // 4. Créer commande interne
        const order: OrderEntity = {
            id: orderId,
            assetId: dto.assetId,
            ctoConfigurationId: dto.ctoConfigurationId,
            customerRef: dto.customerRef,
            priceSnapshot: ctoConfig.priceSnapshot,
            leadTimeDays: ctoConfig.leadTimeDays,
            status: OrderStatus.RESERVED,
            reservationId,
            createdAt: new Date()
        };

        this.orders.set(order.id, order);

        // Émettre événements
        emitOrderCreated(order);
        emitOrderReservationConfirmed(order);

        // 5. Retourner confirmation
        return order;
    }

    /**
     * Récupère une commande par ID
     */
    async getOrder(orderId: string): Promise<OrderEntity | null> {
        return this.orders.get(orderId) ?? null;
    }

    /**
     * Récupère les commandes par customerRef
     */
    async getOrdersByCustomer(customerRef: string): Promise<OrderEntity[]> {
        return Array.from(this.orders.values()).filter(o => o.customerRef === customerRef);
    }

    /**
     * Récupère le prix depuis la configuration CTO (jamais recalculé)
     */
    async getOrderPrice(orderId: string): Promise<PriceSnapshot | null> {
        const order = this.orders.get(orderId);
        if (!order) {
            return null;
        }
        // Le prix est FIGÉ dans le priceSnapshot, jamais recalculé
        return order.priceSnapshot;
    }
}
