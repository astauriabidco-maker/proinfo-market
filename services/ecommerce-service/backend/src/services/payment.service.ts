/**
 * Payment Service
 * Sprint 16 - Paiement B2B
 * 
 * RÈGLES CRITIQUES :
 * - Enregistrement paiement = interne uniquement
 * - Pas de modification de montant facture
 * - Mise à jour automatique statut facture si intégralement payée
 */

import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMethod, InvoiceStatus } from '@prisma/client';
import { PaymentRepository } from '../repositories/payment.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import {
    PaymentEntity,
    PaymentResponse,
    toPaymentResponse,
    canRegisterPayment
} from '../domain/payment.types';

/**
 * Erreur : Rôle non autorisé
 */
export class PaymentUnauthorizedError extends Error {
    constructor(role: string) {
        super(`Role ${role} is not authorized to register payments`);
        this.name = 'PaymentUnauthorizedError';
    }
}

/**
 * Erreur : Facture non trouvée
 */
export class InvoiceNotFoundForPaymentError extends Error {
    constructor(invoiceId: string) {
        super(`Invoice ${invoiceId} not found`);
        this.name = 'InvoiceNotFoundForPaymentError';
    }
}

/**
 * Erreur : Facture non émise
 */
export class InvoiceNotIssuedError extends Error {
    constructor(invoiceId: string) {
        super(`Invoice ${invoiceId} is not issued yet`);
        this.name = 'InvoiceNotIssuedError';
    }
}

/**
 * Erreur : Montant paiement invalide
 */
export class InvalidPaymentAmountError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidPaymentAmountError';
    }
}

export class PaymentService {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly invoiceRepository: InvoiceRepository
    ) { }

    /**
     * Enregistrer un paiement
     * 
     * Règles STRICTES :
     * 1. Rôle interne uniquement
     * 2. Facture ISSUED
     * 3. Montant > 0 et <= remaining
     * 4. Mise à jour statut facture si fully paid
     */
    async registerPayment(
        invoiceId: string,
        method: PaymentMethod,
        amount: number,
        role: string
    ): Promise<{ payment: PaymentResponse; invoicePaid: boolean }> {
        // 1. Vérifier autorisation
        if (!canRegisterPayment(role)) {
            throw new PaymentUnauthorizedError(role);
        }

        // 2. Récupérer la facture
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if (!invoice) {
            throw new InvoiceNotFoundForPaymentError(invoiceId);
        }

        // 3. Vérifier statut facture
        if (invoice.status !== InvoiceStatus.ISSUED && invoice.status !== InvoiceStatus.PAID) {
            throw new InvoiceNotIssuedError(invoiceId);
        }

        // 4. Vérifier montant
        if (amount <= 0) {
            throw new InvalidPaymentAmountError('Amount must be positive');
        }

        const totalPaid = await this.paymentRepository.getTotalPaid(invoiceId);
        const remaining = Number(invoice.amountTotal) - Number(totalPaid);

        if (amount > remaining) {
            throw new InvalidPaymentAmountError(
                `Amount ${amount} exceeds remaining balance ${remaining}`
            );
        }

        // 5. Créer le paiement
        const payment = await this.paymentRepository.create(
            invoiceId,
            method,
            new Decimal(amount)
        );

        // 6. Vérifier si facture intégralement payée
        let invoicePaid = false;
        const newTotalPaid = Number(totalPaid) + amount;

        if (newTotalPaid >= Number(invoice.amountTotal)) {
            await this.invoiceRepository.markPaid(invoiceId);
            invoicePaid = true;
        }

        return {
            payment: toPaymentResponse(payment),
            invoicePaid
        };
    }

    /**
     * Récupérer les paiements d'une facture
     */
    async getPaymentsByInvoice(invoiceId: string): Promise<PaymentResponse[]> {
        const payments = await this.paymentRepository.findByInvoiceId(invoiceId);
        return payments.map(toPaymentResponse);
    }

    /**
     * Obtenir le solde restant d'une facture
     */
    async getRemainingBalance(invoiceId: string): Promise<number> {
        const invoice = await this.invoiceRepository.findById(invoiceId);
        if (!invoice) {
            throw new InvoiceNotFoundForPaymentError(invoiceId);
        }

        const totalPaid = await this.paymentRepository.getTotalPaid(invoiceId);
        return Number(invoice.amountTotal) - Number(totalPaid);
    }
}
