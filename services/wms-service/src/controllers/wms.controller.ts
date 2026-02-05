/**
 * WMS Controller
 * Gère les requêtes HTTP pour le WMS
 */

import { Request, Response, NextFunction } from 'express';
import { WmsService } from '../services/wms.service';
import { PrismaClient } from '@prisma/client';
import {
    AssetNotReservedForPickingError,
    PickingOrderNotFoundError,
    PickingAlreadyExistsError,
    InvalidPickingStatusError
} from '../domain/picking.types';
import {
    AssemblyOrderNotFoundError,
    EmptyAssemblyTasksError,
    InvalidAssemblyStatusError
} from '../domain/assembly.types';
import {
    PickingNotCompletedError,
    AssemblyNotCompletedError
} from '../domain/shipment.types';
import { InventoryServiceError } from '../integrations/inventory.client';
import { AssetServiceError } from '../integrations/asset.client';

export class WmsController {
    private readonly wmsService: WmsService;

    constructor(prisma: PrismaClient) {
        this.wmsService = new WmsService(prisma);
    }

    // ========== PICKING ==========

    createPickingOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assetId = req.body.assetId;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }

            const picking = await this.wmsService.createPickingOrder({ assetId });
            res.status(201).json(picking);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getPickingOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pickingId = req.params.id;
            if (!pickingId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const picking = await this.wmsService.getPickingOrder(pickingId);
            res.status(200).json(picking);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    startPicking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pickingId = req.params.id;
            if (!pickingId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const picking = await this.wmsService.startPicking(pickingId);
            res.status(200).json(picking);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    completePicking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const pickingId = req.params.id;
            if (!pickingId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const picking = await this.wmsService.completePicking(pickingId);
            res.status(200).json(picking);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== ASSEMBLY ==========

    createAssemblyOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, tasks } = req.body;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!tasks || !Array.isArray(tasks)) {
                res.status(400).json({ error: 'ValidationError', message: 'tasks array is required' });
                return;
            }

            const assembly = await this.wmsService.createAssemblyOrder({ assetId, tasks });
            res.status(201).json(assembly);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getAssemblyOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assemblyId = req.params.id;
            if (!assemblyId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const assembly = await this.wmsService.getAssemblyOrder(assemblyId);
            res.status(200).json(assembly);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    startAssembly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assemblyId = req.params.id;
            if (!assemblyId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const assembly = await this.wmsService.startAssembly(assemblyId);
            res.status(200).json(assembly);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    completeAssembly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const assemblyId = req.params.id;
            if (!assemblyId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const assembly = await this.wmsService.completeAssembly(assemblyId);
            res.status(200).json(assembly);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== SHIPMENTS ==========

    createShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, carrier } = req.body;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!carrier) {
                res.status(400).json({ error: 'ValidationError', message: 'carrier is required' });
                return;
            }

            const shipment = await this.wmsService.createShipment({ assetId, carrier });
            res.status(201).json(shipment);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getShipment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const shipmentId = req.params.id;
            if (!shipmentId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const shipment = await this.wmsService.getShipment(shipmentId);
            if (!shipment) {
                res.status(404).json({ error: 'NotFound', message: 'Shipment not found' });
                return;
            }
            res.status(200).json(shipment);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== RETURNS ==========

    createReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, reason } = req.body;
            if (!assetId) {
                res.status(400).json({ error: 'ValidationError', message: 'assetId is required' });
                return;
            }
            if (!reason) {
                res.status(400).json({ error: 'ValidationError', message: 'reason is required' });
                return;
            }

            const ret = await this.wmsService.processReturn({ assetId, reason });
            res.status(201).json(ret);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    getReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const returnId = req.params.id;
            if (!returnId) {
                res.status(400).json({ error: 'ValidationError', message: 'id is required' });
                return;
            }

            const ret = await this.wmsService.getReturn(returnId);
            if (!ret) {
                res.status(404).json({ error: 'NotFound', message: 'Return not found' });
                return;
            }
            res.status(200).json(ret);
        } catch (error) {
            this.handleError(error, res, next);
        }
    };

    // ========== ERROR HANDLING ==========

    private handleError(error: unknown, res: Response, next: NextFunction): void {
        // Picking errors
        if (error instanceof AssetNotReservedForPickingError) {
            res.status(422).json({ error: 'AssetNotReservedForPickingError', message: error.message });
            return;
        }
        if (error instanceof PickingOrderNotFoundError) {
            res.status(404).json({ error: 'PickingOrderNotFoundError', message: error.message });
            return;
        }
        if (error instanceof PickingAlreadyExistsError) {
            res.status(409).json({ error: 'PickingAlreadyExistsError', message: error.message });
            return;
        }
        if (error instanceof InvalidPickingStatusError) {
            res.status(422).json({ error: 'InvalidPickingStatusError', message: error.message });
            return;
        }

        // Assembly errors
        if (error instanceof AssemblyOrderNotFoundError) {
            res.status(404).json({ error: 'AssemblyOrderNotFoundError', message: error.message });
            return;
        }
        if (error instanceof EmptyAssemblyTasksError) {
            res.status(400).json({ error: 'EmptyAssemblyTasksError', message: error.message });
            return;
        }
        if (error instanceof InvalidAssemblyStatusError) {
            res.status(422).json({ error: 'InvalidAssemblyStatusError', message: error.message });
            return;
        }

        // Shipment errors
        if (error instanceof PickingNotCompletedError) {
            res.status(422).json({ error: 'PickingNotCompletedError', message: error.message });
            return;
        }
        if (error instanceof AssemblyNotCompletedError) {
            res.status(422).json({ error: 'AssemblyNotCompletedError', message: error.message });
            return;
        }

        // Service errors
        if (error instanceof InventoryServiceError) {
            res.status(502).json({
                error: 'InventoryServiceError',
                message: error.message,
                upstreamStatusCode: error.statusCode
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
