/**
 * Invoice Repository
 * Sprint 16 - Facturation B2B
 * 
 * RÈGLE : amountTotal copié de la commande, JAMAIS recalculé
 */

import { PrismaClient, Invoice, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceEntity, generateInvoiceNumber } from '../domain/invoice.types';

export class InvoiceRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Create a new invoice from order
     * amountTotal = copie exacte du total commande
     */
    async create(
        orderId: string,
        companyId: string,
        amountTotal: Decimal
    ): Promise<InvoiceEntity> {
        // Get next sequence number
        const count = await this.prisma.invoice.count();
        const invoiceNumber = generateInvoiceNumber(count + 1);

        const invoice = await this.prisma.invoice.create({
            data: {
                orderId,
                companyId,
                invoiceNumber,
                amountTotal,
                status: InvoiceStatus.DRAFT
            }
        });

        return this.toEntity(invoice);
    }

    /**
     * Find invoice by ID
     */
    async findById(id: string): Promise<InvoiceEntity | null> {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id }
        });

        return invoice ? this.toEntity(invoice) : null;
    }

    /**
     * Find invoice by order ID
     */
    async findByOrderId(orderId: string): Promise<InvoiceEntity | null> {
        const invoice = await this.prisma.invoice.findFirst({
            where: { orderId }
        });

        return invoice ? this.toEntity(invoice) : null;
    }

    /**
     * Find invoices by company
     */
    async findByCompanyId(companyId: string): Promise<InvoiceEntity[]> {
        const invoices = await this.prisma.invoice.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });

        return invoices.map(i => this.toEntity(i));
    }

    /**
     * Issue invoice - set dates and PDF
     */
    async issue(
        id: string,
        pdfUrl: string
    ): Promise<InvoiceEntity> {
        const now = new Date();
        const dueAt = new Date(now);
        dueAt.setDate(dueAt.getDate() + 30);

        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: {
                status: InvoiceStatus.ISSUED,
                issuedAt: now,
                dueAt,
                pdfUrl
            }
        });

        return this.toEntity(invoice);
    }

    /**
     * Mark invoice as paid
     */
    async markPaid(id: string): Promise<InvoiceEntity> {
        const invoice = await this.prisma.invoice.update({
            where: { id },
            data: { status: InvoiceStatus.PAID }
        });

        return this.toEntity(invoice);
    }

    /**
     * Convert Prisma model to entity
     */
    private toEntity(invoice: Invoice): InvoiceEntity {
        return {
            id: invoice.id,
            orderId: invoice.orderId,
            companyId: invoice.companyId,
            invoiceNumber: invoice.invoiceNumber,
            amountTotal: invoice.amountTotal,
            status: invoice.status,
            issuedAt: invoice.issuedAt,
            dueAt: invoice.dueAt,
            pdfUrl: invoice.pdfUrl,
            createdAt: invoice.createdAt
        };
    }
}
