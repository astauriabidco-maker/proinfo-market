/**
 * Assembly Types
 * Types pour les ordres d'assemblage CTO
 */

import { AssemblyStatus } from '@prisma/client';

/**
 * Tâche d'assemblage
 */
export type AssemblyTask = string;

/**
 * DTO pour créer un ordre d'assemblage
 */
export interface CreateAssemblyOrderDto {
    assetId: string;
    tasks: AssemblyTask[];
}

/**
 * Entité Ordre d'Assemblage
 */
export interface AssemblyOrderEntity {
    id: string;
    assetId: string;
    tasks: AssemblyTask[];
    status: AssemblyStatus;
    createdAt: Date;
}

/**
 * Erreur : Assemblage non trouvé
 */
export class AssemblyOrderNotFoundError extends Error {
    constructor(public readonly assemblyId: string) {
        super(`Assembly order ${assemblyId} not found`);
        this.name = 'AssemblyOrderNotFoundError';
    }
}

/**
 * Erreur : Tâches d'assemblage vides
 */
export class EmptyAssemblyTasksError extends Error {
    constructor() {
        super('Assembly order must have at least one task');
        this.name = 'EmptyAssemblyTasksError';
    }
}

/**
 * Erreur : Statut d'assemblage invalide
 */
export class InvalidAssemblyStatusError extends Error {
    constructor(
        public readonly assemblyId: string,
        public readonly currentStatus: AssemblyStatus,
        public readonly expectedStatus: AssemblyStatus
    ) {
        super(`Assembly ${assemblyId} is ${currentStatus}, expected ${expectedStatus}`);
        this.name = 'InvalidAssemblyStatusError';
    }
}
