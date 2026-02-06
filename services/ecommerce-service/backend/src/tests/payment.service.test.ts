/**
 * Payment Service Tests
 * Sprint 16 - Paiement B2B
 * 
 * Tests obligatoires avec noms exacts :
 * 4. should_register_manual_payment
 * 5. should_mark_invoice_paid_when_fully_paid
 * 6. should_not_allow_client_to_mark_paid
 */

import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, InvoiceStatus, PaymentStatus } from '@prisma/client';
import {
    PaymentService,
    PaymentUnauthorizedError,
    InvoiceNotIssuedError,
    InvalidPaymentAmountError
} from '../services/payment.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceEntity } from '../domain/invoice.types';
import { PaymentEntity } from '../domain/payment.types';

// Mock repositories
const mockPaymentRepository = {
    create: jest.fn(),
    findByInvoiceId: jest.fn(),
    getTotalPaid: jest.fn()
};

const mockInvoiceRepository = {
    findById: jest.fn(),
    markPaid: jest.fn()
};

// Test data
const ISSUED_INVOICE: InvoiceEntity = {
    id: 'invoice-1',
    orderId: 'order-123',
    companyId: 'company-abc',
    invoiceNumber: 'FAC-202602-0001',
    amountTotal: new Decimal(10000.00),
    status: InvoiceStatus.ISSUED,
    issuedAt: new Date(),
    dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    pdfUrl: '/invoices/FAC-202602-0001.pdf',
    createdAt: new Date()
};

const DRAFT_INVOICE: InvoiceEntity = {
    ...ISSUED_INVOICE,
    id: 'invoice-draft',
    status: InvoiceStatus.DRAFT,
    issuedAt: null,
    dueAt: null,
    pdfUrl: null
};

const PAYMENT_ENTITY: PaymentEntity = {
    id: 'payment-1',
    invoiceId: 'invoice-1',
    method: PaymentMethod.BANK_TRANSFER,
    status: PaymentStatus.COMPLETED,
    amount: new Decimal(5000.00),
    createdAt: new Date()
};

describe('PaymentService', () => {
    let service: PaymentService;

    beforeEach(() => {
        jest.clearAllMocks();

        service = new PaymentService(
            mockPaymentRepository as unknown as PaymentRepository,
            mockInvoiceRepository as unknown as InvoiceRepository
        );
    });

    /**
     * TEST 4: should_register_manual_payment
     * Vérifie qu'un paiement manuel peut être enregistré par un interne
     */
    it('should_register_manual_payment', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);
        mockPaymentRepository.getTotalPaid.mockResolvedValue(new Decimal(0));
        mockPaymentRepository.create.mockResolvedValue(PAYMENT_ENTITY);

        // Act
        const result = await service.registerPayment(
            ISSUED_INVOICE.id,
            PaymentMethod.BANK_TRANSFER,
            5000.00,
            'SALES_INTERNAL'
        );

        // Assert
        expect(result.payment).toBeDefined();
        expect(result.payment.method).toBe('BANK_TRANSFER');
        expect(result.payment.amount).toBe(5000.00);
        expect(mockPaymentRepository.create).toHaveBeenCalledWith(
            ISSUED_INVOICE.id,
            PaymentMethod.BANK_TRANSFER,
            expect.any(Decimal)
        );
    });

    /**
     * TEST 5: should_mark_invoice_paid_when_fully_paid
     * Vérifie que la facture passe à PAID quand 100% payée
     */
    it('should_mark_invoice_paid_when_fully_paid', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);
        mockPaymentRepository.getTotalPaid.mockResolvedValue(new Decimal(0));

        const fullPayment: PaymentEntity = {
            ...PAYMENT_ENTITY,
            amount: new Decimal(10000.00)
        };
        mockPaymentRepository.create.mockResolvedValue(fullPayment);

        // Act
        const result = await service.registerPayment(
            ISSUED_INVOICE.id,
            PaymentMethod.BANK_TRANSFER,
            10000.00,
            'SALES_INTERNAL'
        );

        // Assert
        expect(result.invoicePaid).toBe(true);
        expect(mockInvoiceRepository.markPaid).toHaveBeenCalledWith(ISSUED_INVOICE.id);
    });

    /**
     * TEST 6: should_not_allow_client_to_mark_paid
     * Vérifie qu'un CLIENT ne peut PAS enregistrer de paiement
     */
    it('should_not_allow_client_to_mark_paid', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);

        // Act & Assert
        await expect(
            service.registerPayment(
                ISSUED_INVOICE.id,
                PaymentMethod.BANK_TRANSFER,
                5000.00,
                'CLIENT'
            )
        ).rejects.toThrow(PaymentUnauthorizedError);

        // Le paiement n'a pas été créé
        expect(mockPaymentRepository.create).not.toHaveBeenCalled();
    });

    /**
     * TEST supplémentaire: Pas de paiement sur facture non émise
     */
    it('should_not_allow_payment_on_draft_invoice', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(DRAFT_INVOICE);

        // Act & Assert
        await expect(
            service.registerPayment(
                DRAFT_INVOICE.id,
                PaymentMethod.BANK_TRANSFER,
                5000.00,
                'SALES_INTERNAL'
            )
        ).rejects.toThrow(InvoiceNotIssuedError);
    });

    /**
     * TEST supplémentaire: Montant paiement > solde restant
     */
    it('should_not_allow_overpayment', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);
        mockPaymentRepository.getTotalPaid.mockResolvedValue(new Decimal(8000.00));

        // Act & Assert - Tenter de payer 5000€ quand il ne reste que 2000€
        await expect(
            service.registerPayment(
                ISSUED_INVOICE.id,
                PaymentMethod.BANK_TRANSFER,
                5000.00,
                'SALES_INTERNAL'
            )
        ).rejects.toThrow(InvalidPaymentAmountError);
    });

    /**
     * TEST supplémentaire: Paiement partiel (invoice reste ISSUED)
     */
    it('should_keep_invoice_issued_on_partial_payment', async () => {
        // Arrange
        mockInvoiceRepository.findById.mockResolvedValue(ISSUED_INVOICE);
        mockPaymentRepository.getTotalPaid.mockResolvedValue(new Decimal(0));
        mockPaymentRepository.create.mockResolvedValue(PAYMENT_ENTITY);

        // Act
        const result = await service.registerPayment(
            ISSUED_INVOICE.id,
            PaymentMethod.BANK_TRANSFER,
            5000.00, // 50% du total
            'SALES_INTERNAL'
        );

        // Assert
        expect(result.invoicePaid).toBe(false);
        expect(mockInvoiceRepository.markPaid).not.toHaveBeenCalled();
    });
});
