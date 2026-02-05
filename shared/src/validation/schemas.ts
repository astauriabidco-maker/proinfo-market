/**
 * Validation Schemas
 * Schémas Zod pour validation stricte des payloads
 */

import { z } from 'zod';

// ============================================
// ASSET SCHEMAS
// ============================================

export const AssetStatusSchema = z.enum([
    'INTAKE',
    'QUALITY_PENDING',
    'QUALITY_PASSED',
    'QUALITY_FAILED',
    'SELLABLE',
    'RESERVED',
    'SOLD',
    'RMA',
    'SCRAPPED'
]);

export const CreateAssetSchema = z.object({
    serialNumber: z.string().min(1).max(100),
    assetType: z.string().min(1).max(50),
    brand: z.string().min(1).max(100),
    model: z.string().min(1).max(100),
    chassisRef: z.string().max(100).optional()
});

export const UpdateAssetStatusSchema = z.object({
    status: AssetStatusSchema
});

// ============================================
// INVENTORY SCHEMAS
// ============================================

export const MovementTypeSchema = z.enum([
    'IN',
    'OUT',
    'TRANSFER',
    'RETURN',
    'SCRAP'
]);

export const CreateMovementSchema = z.object({
    movementType: MovementTypeSchema,
    toLocation: z.string().min(1).max(100),
    fromLocation: z.string().max(100).optional()
});

export const ReserveAssetSchema = z.object({
    orderRef: z.string().min(1).max(100)
});

// ============================================
// CTO SCHEMAS
// ============================================

export const CtoComponentSchema = z.object({
    type: z.string().min(1).max(50),
    reference: z.string().min(1).max(100),
    quantity: z.number().int().positive()
});

export const ValidateCtoConfigurationSchema = z.object({
    assetId: z.string().uuid(),
    productModel: z.string().min(1).max(100),
    components: z.array(CtoComponentSchema).min(1)
});

// ============================================
// ORDER SCHEMAS
// ============================================

export const CreateOrderSchema = z.object({
    assetId: z.string().uuid(),
    ctoConfigurationId: z.string().uuid(),
    customerRef: z.string().min(1).max(100)
});

// ============================================
// SAV SCHEMAS
// ============================================

export const ResolutionTypeSchema = z.enum([
    'REPAIR',
    'REPLACE',
    'REFUND',
    'SCRAP'
]);

export const CreateTicketSchema = z.object({
    assetId: z.string().uuid(),
    customerRef: z.string().min(1).max(100),
    issue: z.string().min(1).max(1000)
});

export const DiagnoseRmaSchema = z.object({
    diagnosis: z.string().min(1).max(2000),
    resolution: ResolutionTypeSchema
});

// ============================================
// QUALITY SCHEMAS
// ============================================

export const CheckTypeSchema = z.enum([
    'VISUAL',
    'FUNCTIONAL',
    'FULL'
]);

export const CreateQualityCheckSchema = z.object({
    assetId: z.string().uuid(),
    checkType: CheckTypeSchema
});

// ============================================
// EXPORT TYPES
// ============================================

export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type CreateAssetDto = z.infer<typeof CreateAssetSchema>;
export type UpdateAssetStatusDto = z.infer<typeof UpdateAssetStatusSchema>;
export type MovementType = z.infer<typeof MovementTypeSchema>;
export type CreateMovementDto = z.infer<typeof CreateMovementSchema>;
export type ReserveAssetDto = z.infer<typeof ReserveAssetSchema>;
export type CtoComponent = z.infer<typeof CtoComponentSchema>;
export type ValidateCtoConfigurationDto = z.infer<typeof ValidateCtoConfigurationSchema>;
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
export type ResolutionType = z.infer<typeof ResolutionTypeSchema>;
export type CreateTicketDto = z.infer<typeof CreateTicketSchema>;
export type DiagnoseRmaDto = z.infer<typeof DiagnoseRmaSchema>;
export type CheckType = z.infer<typeof CheckTypeSchema>;
export type CreateQualityCheckDto = z.infer<typeof CreateQualityCheckSchema>;
