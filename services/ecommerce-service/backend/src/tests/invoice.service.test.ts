/**
 * Invoice Service Tests
 * Sprint 16 - Facturation B2B
 * 
 * Tests obligatoires avec noms exacts :
 * 1. should_create_invoice_from_confirmed_order
 * 2. should_not_recalculate_order_amount
 * 3. should_issue_invoice_and_generate_pdf
 */

import { Decimal } from '@prisma/client/runtime/library';
import { InvoiceStatus } from '@prisma/client';
import {
    InvoiceService,
    OrderNotEligibleError,
    InvoiceAlreadyExistsError,
    InvalidInvoiceStatusError,
    OrderData,
    PDFGenerator
} from '../services/invoice.service';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceEntity } from '../domain/invoice.types';

// Mock repositories
const mockInvoiceRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByOrderId: jest.fn(),
    findByCompanyId: jest.fn(),
    issue: jest.fn(),
    markPaid: jest.fn()
};

const mockPaymentRepository = {
    create: jest.fn(),
    findByInvoiceId: jest.fn(),
    getTotalPaid: jest.fn()
};

// Mock PDF generator
const mockPdfGenerator: PDFGenerator = {
    generateInvoicePdf: jest.fn().mockResolvedValue('/invoices/FAC-202602-0001.pdf')
};

// Test data
const CONFIRMED_ORDER: OrderData = {
    id: 'order-123',
    companyId: 'company-abc',
    status: 'CONFIRMED',
    totalAmount: 12500.00
};

const PENDING_ORDER: OrderData = {
    ...CONFIRMED_ORDER,
    id: 'order-pending',
    status: 'PENDING'
};

const DRAFT_INVOICE: InvoiceEntity = {
    id: 'invoice-1',
    orderId: 'order-123',
    companyId: 'company-abc',
    invoiceNumber: 'FAC-202602-0001',
    amountTotal: new Decimal(12500.00),
    status: InvoiceStatus.DRAFT,
    issuedAt: null,
    dueAt: null,
    pdfUrl: null,
    createdAt: new Date()
};

const ISSUED_INVOICE: InvoiceEntity = {
    ...DRAFT_INVOICE,
    id: 'invoice-issued',
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    pdfUrl: '/invoices/FAC-202602-0001.pdf'
};

describe('InvoiceService', () => {
    let service: InvoiceService;
    let originalAmount: number;

    beforeEach(() => {
        jest.clearAllMocks();
        originalAmount = CONFIRMED_ORDER.totalAmount;

        // Re-set mock returns after clearAllMocks
        (mockPdfGenerator.generateInvoicePdf as jest.Mock).mockResolvedValue('/invoices/FAC-202602-0001.pdf');

        service = new InvoiceService(
            mockInvoiceRepository as unknown as InvoiceRepository,
            mockPaymentRepository as unknown as PaymentRepository,
            mockPdfGenerator
        );
    });

    /**
     * TEST 1: should_create_invoice_from_confirmed_order
     * Vérifie qu'une facture peut être créée depuis une commande CONFIRMED
     */
    it('should_create_invoice_from_confirmed_order', async () => {
        // Arrange
        mockInvoiceRepository.findByOrderId.mockResolvedValue(null);
        mockInvoiceRepository.create.mockResolvedValue(DRAFT_INVOICE);

        // Act
        const result = await service.createFromOrder(CONFIRMED_ORDER);

        // Assert
        expect(result).toBeDefined();
        expect(result.orderId).toBe(CONFIRMED_ORDER.id);
        expect(result.companyId).toBe(CONFIRMED_ORDER.companyId);
        expect(result.status).toBe('DRAFT');

        // Vérifie que create a été appelé avec le bon montant
        expect(mockInvoiceRepository.create).toHaveBeenCalledWith(
            CONFIRMED_ORDER.id,
            CONFIRMED_ORDER.companyId,
            expect.any(Decimal)
        );
    });

    /**
     * TEST 2: should_not_recalculate_order_amount
     * Vérifie que le montant est COPIÉ (pas recalculé)
     */
    it('should_not_recalculate_order_amount', async () => {
        // Arrange
        mockInvoiceRepository.findByOrderId.mockResolvedValue(null);
        mockInvoiceRepository.create.mockImplementation(
            (orderId, companyId, amountTotal) => {
                return Promise.resolve({
                    ...DRAFT_INVOICE,
                    orderId,
                    companyId,
                    amountTotal
                });
            }
        );

        // Act
        const result = await service.createFromOrder(CONFIRMED_ORDER);

        // Assert
        // Le montant doit être EXACTEMENT celui de la commande
        expect(result.amountTotal).toBe(originalAmount);

        // Vérifier que create a été appelé avec le montant EXACT
        const createCall = mockInvoiceRepository.create.mock.calls[0];
        const passedAmount = createCall?.[2];
        expect(Number(passedAmount)).toBe(originalAmount);

        // Pas de modification du montant original
        expect(CONFIRMED_ORDER.totalAmount).toBe(originalAmount);
    });

    /**
     * TEST 3: should_issue_invoice_and_generate_pdf
     * Vérifie que l'émission génère le PDF et les dates
     */
    it('should_issue_invoice_and_generate_pdf', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(DRAFT_INVOICE);
        mockInvoiceRepository.issue.mockResolvedValue(ISSUED_INVOICE);

        // Act
        const result = await service.issue(DRAFT_INVOICE.id);

        // Assert
        expect(result.status).toBe('ISSUED');
        expect(result.pdfUrl).toBeDefined();
        expect(result.issuedAt).toBeDefined();
        expect(result.dueAt).toBeDefined();

        // PDF generator appelé
        expect(mockPdfGenerator.generateInvoicePdf).toHaveBeenCalledWith(DRAFT_INVOICE);

        // Repository issue appelé avec le PDF URL retourné
        expect(mockInvoiceRepository.issue).toHaveBeenCalledWith(
            DRAFT_INVOICE.id,
            '/invoices/FAC-202602-0001.pdf'
        );
    });

    /**
     * TEST supplémentaire: Ne pas créer si commande non CONFIRMED
     */
    it('should_not_create_invoice_from_non_confirmed_order', async () => {
        // Act & Assert
        await expect(
            service.createFromOrder(PENDING_ORDER)
        ).rejects.toThrow(OrderNotEligibleError);

        expect(mockInvoiceRepository.create).not.toHaveBeenCalled();
    });

    /**
     * TEST supplémentaire: Ne pas créer si facture existante
     */
    it('should_not_create_duplicate_invoice', async () => {
        // Arrange
        mockInvoiceRepository.findByOrderId.mockResolvedValue(DRAFT_INVOICE);

        // Act & Assert
        await expect(
            service.createFromOrder(CONFIRMED_ORDER)
        ).rejects.toThrow(InvoiceAlreadyExistsError);
    });

    /**
     * TEST supplémentaire: Ne pas émettre une facture déjà émise
     */
    it('should_not_issue_already_issued_invoice', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);

        // Act & Assert
        await expect(
            service.issue(ISSUED_INVOICE.id)
        ).rejects.toThrow(InvalidInvoiceStatusError);
    });
});
