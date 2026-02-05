/**
 * Inventory Routes
 * Configuration des routes REST pour l'inventaire
 */

import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { PrismaClient } from '@prisma/client';

export function createInventoryRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const controller = new InventoryController(prisma);

    // === Warehouses ===
    router.post('/warehouses', controller.createWarehouse);
    router.get('/warehouses', controller.listWarehouses);
    router.get('/warehouses/:warehouseId', controller.getWarehouse);

    // === Locations ===
    router.post('/warehouses/:warehouseId/locations', controller.createLocation);
    router.get('/warehouses/:warehouseId/locations', controller.listLocations);

    // === Asset Movements ===
    router.post('/assets/:assetId/move', controller.moveAsset);
    router.get('/assets/:assetId/movements', controller.getMovementHistory);
    router.get('/assets/:assetId/position', controller.getCurrentPosition);

    // === Asset Reservations ===
    router.post('/assets/:assetId/reserve', controller.reserveAsset);
    router.post('/assets/:assetId/release', controller.releaseReservation);
    router.get('/assets/:assetId/reservation', controller.getReservation);

    // === Availability ===
    router.get('/assets/:assetId/availability', controller.checkAvailability);

    return router;
}
