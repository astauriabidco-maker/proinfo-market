/**
 * Routing Routes
 * API REST pour le routage multi-entrepôts
 * 
 * RÈGLE : Le système décide, l'humain exécute
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    RoutingService,
    WmsStatusProvider,
    OrderAssignmentStore
} from '../services/routing.service';
import { RoutingRequest } from '../domain/warehouse.types';

// ============================================
// MOCK PROVIDERS (à remplacer par vraies intégrations)
// ============================================

class MockWmsStatusProvider implements WmsStatusProvider {
    private startedOrders = new Set<string>();

    async hasWmsStarted(orderId: string): Promise<boolean> {
        // Mock - en production, requêter le WMS service
        return this.startedOrders.has(orderId);
    }

    // Pour les tests
    markAsStarted(orderId: string): void {
        this.startedOrders.add(orderId);
    }
}

class InMemoryOrderAssignmentStore implements OrderAssignmentStore {
    private assignments = new Map<string, string>();

    async getAssignment(orderId: string): Promise<string | null> {
        return this.assignments.get(orderId) || null;
    }

    async setAssignment(orderId: string, warehouseId: string): Promise<void> {
        this.assignments.set(orderId, warehouseId);
    }
}

// ============================================
// ROUTES
// ============================================

export function createRoutingRouter(prisma: PrismaClient): Router {
    const router = Router();

    const wmsProvider = new MockWmsStatusProvider();
    const assignmentStore = new InMemoryOrderAssignmentStore();
    const routingService = new RoutingService(prisma, wmsProvider, assignmentStore);

    /**
     * POST /warehouses
     * Création d'un entrepôt
     */
    router.post('/warehouses', async (req: Request, res: Response): Promise<void> => {
        try {
            const { code, name, country } = req.body;

            if (!code || !name || !country) {
                res.status(400).json({
                    success: false,
                    error: 'code, name, and country are required'
                });
                return;
            }

            const result = await routingService.createWarehouse({ code, name, country });

            res.status(201).json({
                success: true,
                message: 'Warehouse created',
                data: result
            });
        } catch (error: any) {
            console.error('[Routing] Error creating warehouse:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create warehouse'
            });
        }
    });

    /**
     * GET /warehouses
     * Liste des entrepôts actifs
     */
    router.get('/warehouses', async (req: Request, res: Response): Promise<void> => {
        try {
            const warehouses = await routingService.getActiveWarehouses();

            res.json({
                success: true,
                data: warehouses,
                count: warehouses.length
            });
        } catch (error: any) {
            console.error('[Routing] Error getting warehouses:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get warehouses'
            });
        }
    });

    /**
     * POST /routing/assign
     * Assignation d'une commande à un entrepôt
     * 
     * RÈGLE STRICTE : Le système décide, l'humain exécute
     */
    router.post('/routing/assign', async (req: Request, res: Response): Promise<void> => {
        try {
            const request: RoutingRequest = {
                orderId: req.body.orderId,
                customerCountry: req.body.customerCountry,
                assetIds: req.body.assetIds || []
            };

            if (!request.orderId || !request.customerCountry || request.assetIds.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'orderId, customerCountry, and assetIds are required'
                });
                return;
            }

            const result = await routingService.assignOrderToWarehouse(request);

            res.json({
                success: true,
                message: 'Order assigned to warehouse',
                data: result
            });
        } catch (error: any) {
            console.error('[Routing] Error assigning order:', error);
            const statusCode = error.name === 'NoWarehouseAvailableError' ? 422 :
                error.name === 'WmsAlreadyStartedError' ? 409 : 500;
            res.status(statusCode).json({
                success: false,
                error: error.message || 'Failed to assign order'
            });
        }
    });

    /**
     * GET /stock/:assetId
     * Localisation d'un asset
     */
    router.get('/stock/:assetId', async (req: Request, res: Response): Promise<void> => {
        try {
            const assetId = req.params.assetId;
            if (!assetId) {
                res.status(400).json({
                    success: false,
                    error: 'assetId is required'
                });
                return;
            }

            const location = await routingService.getStockLocation(assetId);

            if (!location) {
                res.status(404).json({
                    success: false,
                    error: 'Asset not found in stock'
                });
                return;
            }

            res.json({
                success: true,
                data: location
            });
        } catch (error: any) {
            console.error('[Routing] Error getting stock location:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get stock location'
            });
        }
    });

    return router;
}
