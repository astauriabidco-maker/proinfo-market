/**
 * Payment Routes
 * Sprint 16 - Paiement B2B
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, PaymentMethod } from '@prisma/client';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import {
    PaymentService,
    PaymentUnauthorizedError,
    InvoiceNotFoundForPaymentError,
    InvoiceNotIssuedError,
    InvalidPaymentAmountError
} from '../services/payment.service';
import { authMiddleware } from '../middleware/auth.middleware';

/**
 * Extract user role from request
 */
function getUserRole(req: Request): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (req as any).user?.role || 'CLIENT';
}

export function createPaymentRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const paymentRepository = new PaymentRepository(prisma);
    const invoiceRepository = new InvoiceRepository(prisma);
    const paymentService = new PaymentService(paymentRepository, invoiceRepository);

    // Auth required
    router.use(authMiddleware);

    /**
     * POST /v2/invoices/:invoiceId/payments
     * Register payment (internal only)
     */
    router.post('/:invoiceId/payments', async (req: Request, res: Response) => {
        try {
            const invoiceId = req.params.invoiceId ?? '';
            const { method, amount } = req.body;
            const role = getUserRole(req);

            if (!method || amount === undefined) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'method and amount are required'
                });
                return;
            }

            // Validate payment method
            const validMethods = ['BANK_TRANSFER', 'CARD', 'MANUAL'];
            if (!validMethods.includes(method)) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: `method must be one of: ${validMethods.join(', ')}`
                });
                return;
            }

            const result = await paymentService.registerPayment(
                invoiceId,
                method as PaymentMethod,
                amount,
                role
            );

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof PaymentUnauthorizedError) {
                res.status(403).json({ error: 'Forbidden', message: error.message });
                return;
            }
            if (error instanceof InvoiceNotFoundForPaymentError) {
                res.status(404).json({ error: 'InvoiceNotFound', message: error.message });
                return;
            }
            if (error instanceof InvoiceNotIssuedError) {
                res.status(400).json({ error: 'InvoiceNotIssued', message: error.message });
                return;
            }
            if (error instanceof InvalidPaymentAmountError) {
                res.status(400).json({ error: 'InvalidAmount', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/invoices/:invoiceId/payments
     * List payments for invoice
     */
    router.get('/:invoiceId/payments', async (req: Request, res: Response) => {
        const invoiceId = req.params.invoiceId ?? '';
        const payments = await paymentService.getPaymentsByInvoice(invoiceId);
        res.json(payments);
    });

    /**
     * GET /v2/invoices/:invoiceId/balance
     * Get remaining balance
     */
    router.get('/:invoiceId/balance', async (req: Request, res: Response) => {
        try {
            const invoiceId = req.params.invoiceId ?? '';
            const remaining = await paymentService.getRemainingBalance(invoiceId);
            res.json({ invoiceId, remaining });
        } catch (error) {
            if (error instanceof InvoiceNotFoundForPaymentError) {
                res.status(404).json({ error: 'InvoiceNotFound', message: error.message });
                return;
            }
            throw error;
        }
    });

    return router;
}
