/**
 * Invoice Routes
 * Sprint 16 - Facturation B2B
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import {
    InvoiceService,
    OrderNotEligibleError,
    InvoiceAlreadyExistsError,
    InvoiceNotFoundError,
    InvalidInvoiceStatusError
} from '../services/invoice.service';
import { authMiddleware, getCompanyId } from '../middleware/auth.middleware';

export function createInvoiceRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const invoiceRepository = new InvoiceRepository(prisma);
    const paymentRepository = new PaymentRepository(prisma);
    const invoiceService = new InvoiceService(invoiceRepository, paymentRepository);

    // Auth required for all routes
    router.use(authMiddleware);

    /**
     * POST /v2/orders/:orderId/invoice
     * Create invoice from confirmed order
     */
    router.post('/orders/:orderId/invoice', async (req: Request, res: Response) => {
        try {
            const orderId = req.params.orderId ?? '';

            // In production: fetch order from OrderService
            // Mock order data for now
            const { companyId, totalAmount, status } = req.body;

            if (!companyId || !totalAmount || !status) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'companyId, totalAmount, and status are required'
                });
                return;
            }

            const invoice = await invoiceService.createFromOrder({
                id: orderId,
                companyId,
                status,
                totalAmount
            });

            res.status(201).json(invoice);
        } catch (error) {
            if (error instanceof OrderNotEligibleError) {
                res.status(400).json({ error: 'OrderNotEligible', message: error.message });
                return;
            }
            if (error instanceof InvoiceAlreadyExistsError) {
                res.status(409).json({ error: 'InvoiceExists', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /v2/invoices/:id/issue
     * Issue an invoice (generate PDF)
     */
    router.post('/:id/issue', async (req: Request, res: Response) => {
        try {
            const invoiceId = req.params.id ?? '';
            const invoice = await invoiceService.issue(invoiceId);
            res.json(invoice);
        } catch (error) {
            if (error instanceof InvoiceNotFoundError) {
                res.status(404).json({ error: 'InvoiceNotFound', message: error.message });
                return;
            }
            if (error instanceof InvalidInvoiceStatusError) {
                res.status(400).json({ error: 'InvalidStatus', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/invoices/:id
     * Get invoice details
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const invoiceId = req.params.id ?? '';
            const invoice = await invoiceService.getInvoice(invoiceId);
            res.json(invoice);
        } catch (error) {
            if (error instanceof InvoiceNotFoundError) {
                res.status(404).json({ error: 'InvoiceNotFound', message: error.message });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /v2/invoices
     * List company invoices
     */
    router.get('/', async (req: Request, res: Response) => {
        const companyId = getCompanyId(req);
        if (!companyId) {
            res.status(400).json({ error: 'ValidationError', message: 'companyId required' });
            return;
        }
        const invoices = await invoiceService.getInvoicesByCompany(companyId);
        res.json(invoices);
    });

    return router;
}
