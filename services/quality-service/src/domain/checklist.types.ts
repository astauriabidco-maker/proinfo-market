/**
 * Checklist Types
 * Types pour les checklists qualité
 */

import { AssetType } from '@prisma/client';

/**
 * DTO pour créer une checklist
 */
export interface CreateChecklistDto {
    name: string;
    assetType: AssetType;
    version: number;
    items: CreateChecklistItemDto[];
}

/**
 * DTO pour un item de checklist
 */
export interface CreateChecklistItemDto {
    code: string;
    description: string;
    isBlocking: boolean;
}

/**
 * Entité Checklist
 */
export interface ChecklistEntity {
    id: string;
    name: string;
    assetType: AssetType;
    version: number;
    createdAt: Date;
    items?: ChecklistItemEntity[];
}

/**
 * Entité Item de Checklist
 */
export interface ChecklistItemEntity {
    id: string;
    checklistId: string;
    code: string;
    description: string;
    isBlocking: boolean;
}

/**
 * Erreur : Checklist non trouvée
 */
export class ChecklistNotFoundError extends Error {
    constructor(public readonly checklistId?: string, public readonly assetType?: AssetType) {
        super(checklistId
            ? `Checklist with id ${checklistId} not found`
            : `No checklist found for asset type ${assetType}`
        );
        this.name = 'ChecklistNotFoundError';
    }
}

/**
 * Erreur : Checklist déjà existante
 */
export class DuplicateChecklistError extends Error {
    constructor(
        public readonly name: string,
        public readonly assetType: AssetType,
        public readonly version: number
    ) {
        super(`Checklist "${name}" for ${assetType} v${version} already exists`);
        this.name = 'DuplicateChecklistError';
    }
}
