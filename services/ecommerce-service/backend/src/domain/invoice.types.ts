/**
 * Invoice Domain Types
 * Sprint 16 - Facturation B2B
 * 
 * RÈGLE CRITIQUE : amountTotal = copie EXACTE du total commande
 * JAMAIS de recalcul
 */

import { InvoiceStatus as PrismaInvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Re-export Prisma enums
export { PrismaInvoiceStatus as InvoiceStatus };

/**
 * Invoice entity from database
 */
export interface InvoiceEntity {
    id: string;
    orderId: string;
    companyId: string;
    invoiceNumber: string;
    amountTotal: Decimal;
    status: PrismaInvoiceStatus;
    issuedAt: Date | null;
    dueAt: Date | null;
    pdfUrl: string | null;
    createdAt: Date;
}

/**
 * DTO for creating an invoice
 */
export interface CreateInvoiceDto {
    orderId: string;
    companyId: string;
    amountTotal: Decimal;
}

/**
 * Invoice response for API
 */
export interface InvoiceResponse {
    id: string;
    orderId: string;
    companyId: string;
    invoiceNumber: string;
    amountTotal: number;
    status: string;
    issuedAt: Date | null;
    dueAt: Date | null;
    pdfUrl: string | null;
    createdAt: Date;
}

/**
 * Transform entity to response
 */
export function toInvoiceResponse(invoice: InvoiceEntity): InvoiceResponse {
    return {
        id: invoice.id,
        orderId: invoice.orderId,
        companyId: invoice.companyId,
        invoiceNumber: invoice.invoiceNumber,
        amountTotal: Number(invoice.amountTotal),
        status: invoice.status,
        issuedAt: invoice.issuedAt,
        dueAt: invoice.dueAt,
        pdfUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt
    };
}

/**
 * Generate invoice number (simple sequential)
 * Format: FAC-YYYYMM-XXXX
 */
export function generateInvoiceNumber(sequence: number): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(sequence).padStart(4, '0');
    return `FAC-${year}${month}-${seq}`;
}
