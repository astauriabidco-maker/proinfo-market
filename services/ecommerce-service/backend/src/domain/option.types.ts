/**
 * Option Domain Types
 * Sprint 14 - Options Premium & Garanties Étendues
 * 
 * RÈGLE CRITIQUE : Les options n'impactent PAS le CTO validé
 * Elles sont facturées en lignes distinctes
 */

import { OptionCategory as PrismaOptionCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Re-export Prisma enum
export { PrismaOptionCategory as OptionCategory };

/**
 * Option entity from database
 */
export interface OptionEntity {
    id: string;
    name: string;
    category: PrismaOptionCategory;
    description: string;
    price: Decimal;
    active: boolean;
    createdAt: Date;
}

/**
 * OrderOption entity - frozen price at add time
 */
export interface OrderOptionEntity {
    id: string;
    orderId: string;
    optionId: string;
    price: Decimal;  // FROZEN at add time
    createdAt: Date;
    option?: OptionEntity;
}

/**
 * DTO for adding options to an order
 */
export interface AddOptionsToOrderDto {
    optionIds: string[];
}

/**
 * Option response for API
 */
export interface OptionResponse {
    id: string;
    name: string;
    category: string;
    description: string;
    price: number;
    active: boolean;
}

/**
 * OrderOption response for API
 */
export interface OrderOptionResponse {
    id: string;
    optionId: string;
    optionName: string;
    price: number;
    addedAt: Date;
}

/**
 * Order options summary for B2B display
 */
export interface OrderOptionsSummary {
    options: OrderOptionResponse[];
    totalOptionsPrice: number;
    count: number;
}

/**
 * Transform Option entity to API response
 */
export function toOptionResponse(option: OptionEntity): OptionResponse {
    return {
        id: option.id,
        name: option.name,
        category: option.category,
        description: option.description,
        price: Number(option.price),
        active: option.active
    };
}

/**
 * Transform OrderOption entity to API response
 */
export function toOrderOptionResponse(orderOption: OrderOptionEntity): OrderOptionResponse {
    return {
        id: orderOption.id,
        optionId: orderOption.optionId,
        optionName: orderOption.option?.name ?? 'Unknown',
        price: Number(orderOption.price),
        addedAt: orderOption.createdAt
    };
}

/**
 * Calculate total options price
 */
export function calculateOptionsTotal(options: OrderOptionEntity[]): number {
    return options.reduce((sum, opt) => sum + Number(opt.price), 0);
}
