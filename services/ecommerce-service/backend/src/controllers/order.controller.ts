/**
 * Order Controller
 * Gère les requêtes HTTP pour les commandes
 */

import { Request, Response, NextFunction } from 'express';
import {
    OrderService,
    CtoNotValidatedError,
    AssetNotAvailableError,
    ReservationFailedError
} from '../services/order.service';
import { CtoServiceError } from '../integrations/cto.client';
import { InventoryServiceError } from '../integrations/inventory.client';

export class OrderController {
    private readonly orderService: OrderService;

    constructor() {
        this.orderService = new OrderService();
    }

    /**
     * POST /orders
     * Crée une nouvelle commande
     */
    createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, ctoConfigurationId, customerRef } = req.body;

            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!ctoConfigurationId) {
                res.status(400).json({ error: 'ValidationError', message: 'ctoConfigurationId is required' });
                return;
            }
            if (!customerRef) {
                res.status(400).json({ error: 'ValidationError', message: 'customerRef is required' });
                return;
            }

            const order = await this.orderService.createOrder({
                assetId,
                ctoConfigurationId,
                customerRef
            });

            res.status(201).json(order);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /orders/:id
     * Récupère une commande par ID
     */
    getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const orderId = req.params.id;
            if (!orderId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const order = await this.orderService.getOrder(orderId);
            if (!order) {
                res.status(404).json({ error: 'NotFound', message: 'Order not found' });
                return;
            }

            res.status(200).json(order);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * GET /orders/:id/price
     * Récupère le prix figé d'une commande
     */
    getOrderPrice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const orderId = req.params.id;
            if (!orderId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const priceSnapshot = await this.orderService.getOrderPrice(orderId);
            if (!priceSnapshot) {
                res.status(404).json({ error: 'NotFound', message: 'Order not found' });
                return;
            }

            res.status(200).json({
                priceSnapshot,
                message: 'Price is frozen from CTO validation and will not be recalculated'
            });
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    /**
     * Gestion des erreurs
     */
    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof CtoNotValidatedError) {
            res.status(422).json({ error: 'CtoNotValidatedError', message: error.message });
            return;
        }
        if (error instanceof AssetNotAvailableError) {
            res.status(422).json({ error: 'AssetNotAvailableError', message: error.message });
            return;
        }
        if (error instanceof ReservationFailedError) {
            res.status(422).json({ error: 'ReservationFailedError', message: error.message });
            return;
        }
        if (error instanceof CtoServiceError) {
            res.status(502).json({
                error: 'CtoServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }
        if (error instanceof InventoryServiceError) {
            res.status(502).json({
                error: 'InventoryServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }

        console.error('[ERROR]', error);
        next(error);
    }
}
