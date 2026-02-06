/**
 * Payment Repository
 * Sprint 16 - Paiement B2B
 */

import { PrismaClient, Payment, PaymentMethod, PaymentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentEntity } from '../domain/payment.types';

export class PaymentRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Create a new payment
     */
    async create(
        invoiceId: string,
        method: PaymentMethod,
        amount: Decimal
    ): Promise<PaymentEntity> {
        const payment = await this.prisma.payment.create({
            data: {
                invoiceId,
                method,
                amount,
                status: PaymentStatus.COMPLETED
            }
        });

        return this.toEntity(payment);
    }

    /**
     * Find payments by invoice ID
     */
    async findByInvoiceId(invoiceId: string): Promise<PaymentEntity[]> {
        const payments = await this.prisma.payment.findMany({
            where: { invoiceId },
            orderBy: { createdAt: 'asc' }
        });

        return payments.map(p => this.toEntity(p));
    }

    /**
     * Get total paid for an invoice
     */
    async getTotalPaid(invoiceId: string): Promise<Decimal> {
        const result = await this.prisma.payment.aggregate({
            where: {
                invoiceId,
                status: PaymentStatus.COMPLETED
            },
            _sum: { amount: true }
        });

        return result._sum.amount ?? new Decimal(0);
    }

    /**
     * Convert Prisma model to entity
     */
    private toEntity(payment: Payment): PaymentEntity {
        return {
            id: payment.id,
            invoiceId: payment.invoiceId,
            method: payment.method,
            status: payment.status,
            amount: payment.amount,
            createdAt: payment.createdAt
        };
    }
}
