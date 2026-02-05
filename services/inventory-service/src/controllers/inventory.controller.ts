/**
 * Inventory Controller
 * Gère les requêtes HTTP pour l'inventaire
 */

import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service';
import { PrismaClient, LocationType, MovementReason } from '@prisma/client';
import {
    WarehouseNotFoundError,
    LocationNotFoundError,
    DuplicateLocationError
} from '../domain/location.types';
import { MissingToLocationError } from '../domain/movement.types';
import {
    AssetAlreadyReservedError,
    AssetNotReservedError,
    AssetNotSellableError
} from '../domain/reservation.types';
import { AssetServiceError } from '../integrations/asset.client';

export class InventoryController {
    private readonly inventoryService: InventoryService;

    constructor(prisma: PrismaClient) {
        this.inventoryService = new InventoryService(prisma);
    }

    // ========== WAREHOUSES ==========

    createWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const name = req.body.name;
            if (!name) {
                res.status(400).json({ error: 'ValidationError', message: 'name is required' });
                return;
            }
            const warehouse = await this.inventoryService.createWarehouse({ name });
            res.status(201).json(warehouse);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    listWarehouses = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const warehouses = await this.inventoryService.listWarehouses();
            res.status(200).json(warehouses);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getWarehouse = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const warehouseId = req.params.warehouseId;
            if (!warehouseId) {
                res.status(400).json({ error: 'ValidationError', message: 'warehouseId is required' });
                return;
            }
            const warehouse = await this.inventoryService.getWarehouse(warehouseId);
            res.status(200).json(warehouse);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== LOCATIONS ==========

    createLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const warehouseId = req.params.warehouseId;
            if (!warehouseId) {
                res.status(400).json({ error: 'ValidationError', message: 'warehouseId is required' });
                return;
            }

            const code = req.body.code;
            const type = req.body.type as LocationType;

            if (!code || !type) {
                res.status(400).json({ error: 'ValidationError', message: 'code and type are required' });
                return;
            }

            const location = await this.inventoryService.createLocation(warehouseId, { code, type });
            res.status(201).json(location);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    listLocations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const warehouseId = req.params.warehouseId;
            if (!warehouseId) {
                res.status(400).json({ error: 'ValidationError', message: 'warehouseId is required' });
                return;
            }
            const locations = await this.inventoryService.listLocations(warehouseId);
            res.status(200).json(locations);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== MOVEMENTS ==========

    moveAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }

            const toLocation = req.body.toLocation;
            const reason = req.body.reason as MovementReason;

            if (!toLocation || !reason) {
                res.status(400).json({ error: 'ValidationError', message: 'toLocation and reason are required' });
                return;
            }

            const movement = await this.inventoryService.moveAsset(assetId, {
                fromLocation: req.body.fromLocation,
                toLocation,
                reason
            });
            res.status(201).json(movement);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getMovementHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            const movements = await this.inventoryService.getMovementHistory(assetId);
            res.status(200).json(movements);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getCurrentPosition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            const position = await this.inventoryService.getCurrentPosition(assetId);
            res.status(200).json(position);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== RESERVATIONS ==========

    reserveAsset = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }

            const orderRef = req.body.orderRef;
            if (!orderRef) {
                res.status(400).json({ error: 'ValidationError', message: 'orderRef is required' });
                return;
            }

            const reservation = await this.inventoryService.reserveAsset(assetId, { orderRef });
            res.status(201).json(reservation);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    releaseReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            await this.inventoryService.releaseReservation(assetId);
            res.status(204).send();
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getReservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            const reservation = await this.inventoryService.getReservation(assetId);
            if (!reservation) {
                res.status(404).json({ error: 'NotFound', message: 'No reservation found' });
                return;
            }
            res.status(200).json(reservation);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== AVAILABILITY ==========

    checkAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            const availability = await this.inventoryService.checkAvailability(assetId);
            res.status(200).json(availability);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== ERROR HANDLING ==========

    private handleError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof WarehouseNotFoundError) {
            res.status(404).json({ error: 'WarehouseNotFoundError', message: error.message });
            return;
        }

        if (error instanceof LocationNotFoundError) {
            res.status(404).json({ error: 'LocationNotFoundError', message: error.message });
            return;
        }

        if (error instanceof DuplicateLocationError) {
            res.status(409).json({ error: 'DuplicateLocationError', message: error.message });
            return;
        }

        if (error instanceof MissingToLocationError) {
            res.status(400).json({ error: 'MissingToLocationError', message: error.message });
            return;
        }

        if (error instanceof AssetAlreadyReservedError) {
            res.status(409).json({
                error: 'AssetAlreadyReservedError',
                message: error.message,
                existingOrderRef: error.existingOrderRef
            });
            return;
        }

        if (error instanceof AssetNotReservedError) {
            res.status(404).json({ error: 'AssetNotReservedError', message: error.message });
            return;
        }

        if (error instanceof AssetNotSellableError) {
            res.status(422).json({
                error: 'AssetNotSellableError',
                message: error.message,
                currentStatus: error.currentStatus
            });
            return;
        }

        if (error instanceof AssetServiceError) {
            res.status(502).json({
                error: 'AssetServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
            });
            return;
        }

        console.error('[ERROR]', error);
        next(error);
    }
}
