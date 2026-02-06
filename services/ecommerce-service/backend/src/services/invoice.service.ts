/**
 * Invoice Service
 * Sprint 16 - Facturation B2B
 * 
 * RÈGLES CRITIQUES :
 * - amountTotal = copie EXACTE, JAMAIS de recalcul
 * - Facture = document légal, pas d'édition
 * - PDF opposable après émission
 */

import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import {
    InvoiceEntity,
    InvoiceResponse,
    toInvoiceResponse
} from '../domain/invoice.types';

/**
 * Erreur : Commande non éligible
 */
export class OrderNotEligibleError extends Error {
    constructor(orderId: string, reason: string) {
        super(`Order ${orderId} not eligible for invoicing: ${reason}`);
        this.name = 'OrderNotEligibleError';
    }
}

/**
 * Erreur : Facture déjà existante
 */
export class InvoiceAlreadyExistsError extends Error {
    constructor(orderId: string) {
        super(`Invoice already exists for order ${orderId}`);
        this.name = 'InvoiceAlreadyExistsError';
    }
}

/**
 * Erreur : Facture non trouvée
 */
export class InvoiceNotFoundError extends Error {
    constructor(invoiceId: string) {
        super(`Invoice ${invoiceId} not found`);
        this.name = 'InvoiceNotFoundError';
    }
}

/**
 * Erreur : Statut facture invalide
 */
export class InvalidInvoiceStatusError extends Error {
    constructor(invoiceId: string, expectedStatus: string, actualStatus: string) {
        super(`Invoice ${invoiceId} has status ${actualStatus}, expected ${expectedStatus}`);
        this.name = 'InvalidInvoiceStatusError';
    }
}

/**
 * Interface for order data (from OrderService or API)
 */
export interface OrderData {
    id: string;
    companyId: string;
    status: string;
    totalAmount: number;
}

/**
 * PDF Generator interface (mock for now)
 */
export interface PDFGenerator {
    generateInvoicePdf(invoice: InvoiceEntity): Promise<string>;
}

/**
 * Simple mock PDF generator
 */
export class MockPDFGenerator implements PDFGenerator {
    async generateInvoicePdf(invoice: InvoiceEntity): Promise<string> {
        // In production: use pdf-lib or similar
        return `/invoices/${invoice.invoiceNumber}.pdf`;
    }
}

export class InvoiceService {
    private pdfGenerator: PDFGenerator;

    constructor(
        private readonly invoiceRepository: InvoiceRepository,
        private readonly paymentRepository: PaymentRepository,
        pdfGenerator?: PDFGenerator
    ) {
        this.pdfGenerator = pdfGenerator ?? new MockPDFGenerator();
    }

    /**
     * Créer une facture depuis une commande
     * 
     * Règles STRICTES :
     * 1. Commande doit être CONFIRMED
     * 2. Pas de facture existante
     * 3. amountTotal = copie EXACTE (pas de recalcul)
     */
    async createFromOrder(order: OrderData): Promise<InvoiceResponse> {
        // 1. Vérifier statut commande
        if (order.status !== 'CONFIRMED') {
            throw new OrderNotEligibleError(order.id, `status is ${order.status}`);
        }

        // 2. Vérifier absence de facture existante
        const existingInvoice = await this.invoiceRepository.findByOrderId(order.id);
        if (existingInvoice) {
            throw new InvoiceAlreadyExistsError(order.id);
        }

        // 3. Créer facture avec montant COPIÉ (pas recalculé)
        const invoice = await this.invoiceRepository.create(
            order.id,
            order.companyId,
            new Decimal(order.totalAmount)
        );

        return toInvoiceResponse(invoice);
    }

    /**
     * Émettre une facture (génération PDF, dates)
     * 
     * Règles :
     * 1. Facture DRAFT uniquement
     * 2. Génération PDF
     * 3. issuedAt = now, dueAt = +30 jours
     */
    async issue(invoiceId: string): Promise<InvoiceResponse> {
        const invoice = await this.invoiceRepository.findById(invoiceId);

        if (!invoice) {
            throw new InvoiceNotFoundError(invoiceId);
        }

        if (invoice.status !== InvoiceStatus.DRAFT) {
            throw new InvalidInvoiceStatusError(invoiceId, 'DRAFT', invoice.status);
        }

        // Générer PDF
        const pdfUrl = await this.pdfGenerator.generateInvoicePdf(invoice);

        // Émettre la facture
        const issuedInvoice = await this.invoiceRepository.issue(invoiceId, pdfUrl);

        return toInvoiceResponse(issuedInvoice);
    }

    /**
     * Récupérer une facture
     */
    async getInvoice(invoiceId: string): Promise<InvoiceResponse> {
        const invoice = await this.invoiceRepository.findById(invoiceId);

        if (!invoice) {
            throw new InvoiceNotFoundError(invoiceId);
        }

        return toInvoiceResponse(invoice);
    }

    /**
     * Récupérer les factures d'une entreprise
     */
    async getInvoicesByCompany(companyId: string): Promise<InvoiceResponse[]> {
        const invoices = await this.invoiceRepository.findByCompanyId(companyId);
        return invoices.map(toInvoiceResponse);
    }

    /**
     * Vérifier et mettre à jour le statut si intégralement payée
     */
    async checkAndMarkPaid(invoiceId: string): Promise<boolean> {
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if (!invoice || invoice.status === InvoiceStatus.PAID) {
            return false;
        }

        const totalPaid = await this.paymentRepository.getTotalPaid(invoiceId);

        if (totalPaid.greaterThanOrEqualTo(invoice.amountTotal)) {
            await this.invoiceRepository.markPaid(invoiceId);
            return true;
        }

        return false;
    }
}
