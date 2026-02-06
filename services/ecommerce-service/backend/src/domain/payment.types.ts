/**
 * Payment Domain Types
 * Sprint 16 - Paiement B2B
 * 
 * RÈGLE : Enregistrement paiement = interne uniquement
 */

import {
    PaymentMethod as PrismaPaymentMethod,
    PaymentStatus as PrismaPaymentStatus
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Re-export Prisma enums
export { PrismaPaymentMethod as PaymentMethod, PrismaPaymentStatus as PaymentStatus };

/**
 * Payment entity from database
 */
export interface PaymentEntity {
    id: string;
    invoiceId: string;
    method: PrismaPaymentMethod;
    status: PrismaPaymentStatus;
    amount: Decimal;
    createdAt: Date;
}

/**
 * DTO for registering a payment
 */
export interface RegisterPaymentDto {
    method: PrismaPaymentMethod;
    amount: number;
}

/**
 * Payment response for API
 */
export interface PaymentResponse {
    id: string;
    invoiceId: string;
    method: string;
    status: string;
    amount: number;
    createdAt: Date;
}

/**
 * Transform entity to response
 */
export function toPaymentResponse(payment: PaymentEntity): PaymentResponse {
    return {
        id: payment.id,
        invoiceId: payment.invoiceId,
        method: payment.method,
        status: payment.status,
        amount: Number(payment.amount),
        createdAt: payment.createdAt
    };
}

/**
 * Check if role is internal (can register payments)
 */
export function canRegisterPayment(role: string): boolean {
    return role === 'SALES_INTERNAL' || role === 'TECH_INTERNAL' || role === 'ADMIN';
}
