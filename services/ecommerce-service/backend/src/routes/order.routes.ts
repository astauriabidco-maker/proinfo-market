/**
 * Order Routes
 * Configuration des routes REST pour les commandes
 */

import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';

export function createOrderRoutes(): Router {
    const router = Router();
    const controller = new OrderController();

    // Création commande
    router.post('/', controller.createOrder);

    // Récupération commande
    router.get('/:id', controller.getOrder);

    // Récupération prix figé
    router.get('/:id/price', controller.getOrderPrice);

    return router;
}
