/**
 * Task Domain Types
 * Types et erreurs pour les tâches WMS Sprint 17
 * 
 * RÈGLE ABSOLUE : Le WMS commande, l'opérateur exécute
 */

import { TaskType, TaskStatus } from '@prisma/client';

// ========== ENTITIES ==========

export interface WmsTaskEntity {
    id: string;
    assetId: string;
    type: TaskType;
    status: TaskStatus;
    operatorId: string | null;
    createdAt: Date;
    startedAt: Date | null;
    endedAt: Date | null;
}

export interface TaskStepEntity {
    id: string;
    taskId: string;
    stepOrder: number;
    description: string;
    scanRequired: boolean;
    expectedCode: string | null;
    scannedCode: string | null;
    completed: boolean;
    completedAt: Date | null;
}

export interface ScanLogEntity {
    id: string;
    taskId: string;
    stepId: string | null;
    code: string;
    valid: boolean;
    scannedAt: Date;
}

// ========== DTOs ==========

export interface CreateTaskDto {
    assetId: string;
    type: TaskType;
    steps: CreateTaskStepDto[];
}

export interface CreateTaskStepDto {
    stepOrder: number;
    description: string;
    scanRequired?: boolean;
    expectedCode?: string;
}

export interface StartTaskDto {
    operatorId: string;
    scanCode: string;
}

export interface ExecuteStepDto {
    stepId: string;
    scanCode: string;
}

// ========== TASK TEMPLATES ==========

/**
 * Templates d'étapes par type de tâche
 * Chaque type a ses étapes obligatoires avec scan
 */
export const TASK_STEP_TEMPLATES: Record<TaskType, CreateTaskStepDto[]> = {
    PICKING: [
        { stepOrder: 1, description: 'Scanner emplacement source', scanRequired: true },
        { stepOrder: 2, description: 'Scanner asset', scanRequired: true },
        { stepOrder: 3, description: 'Confirmation visuelle', scanRequired: false }
    ],
    ASSEMBLY: [
        { stepOrder: 1, description: 'Scanner asset principal', scanRequired: true },
        { stepOrder: 2, description: 'Scanner composants', scanRequired: true },
        { stepOrder: 3, description: 'Valider compatibilité CTO', scanRequired: false },
        { stepOrder: 4, description: 'Checklist assemblage', scanRequired: false }
    ],
    QA: [
        { stepOrder: 1, description: 'Scanner asset', scanRequired: true },
        { stepOrder: 2, description: 'Checklist qualité', scanRequired: false },
        { stepOrder: 3, description: 'Scan final validation', scanRequired: true }
    ],
    SHIPPING: [
        { stepOrder: 1, description: 'Scanner asset', scanRequired: true },
        { stepOrder: 2, description: 'Scanner colis', scanRequired: true },
        { stepOrder: 3, description: 'Confirmation expédition', scanRequired: false }
    ]
};

// ========== ERRORS ==========

/**
 * Erreur : Scan invalide (code ne correspond pas)
 */
export class InvalidScanError extends Error {
    constructor(
        public readonly expected: string,
        public readonly received: string
    ) {
        super(`Invalid scan: expected "${expected}", received "${received}"`);
        this.name = 'InvalidScanError';
    }
}

/**
 * Erreur : Tâche n'est pas PENDING
 */
export class TaskNotPendingError extends Error {
    constructor(
        public readonly taskId: string,
        public readonly currentStatus: TaskStatus
    ) {
        super(`Task ${taskId} is not PENDING (current: ${currentStatus})`);
        this.name = 'TaskNotPendingError';
    }
}

/**
 * Erreur : Tâche non trouvée
 */
export class TaskNotFoundError extends Error {
    constructor(public readonly taskId: string) {
        super(`Task ${taskId} not found`);
        this.name = 'TaskNotFoundError';
    }
}

/**
 * Erreur : Opérateur déjà occupé sur une autre tâche
 */
export class OperatorBusyError extends Error {
    constructor(
        public readonly operatorId: string,
        public readonly currentTaskId: string
    ) {
        super(`Operator ${operatorId} is busy on task ${currentTaskId}`);
        this.name = 'OperatorBusyError';
    }
}

/**
 * Erreur : Étape non trouvée
 */
export class StepNotFoundError extends Error {
    constructor(
        public readonly taskId: string,
        public readonly stepId: string
    ) {
        super(`Step ${stepId} not found in task ${taskId}`);
        this.name = 'StepNotFoundError';
    }
}

/**
 * Erreur : Étapes incomplètes
 */
export class IncompleteStepsError extends Error {
    constructor(
        public readonly taskId: string,
        public readonly remainingSteps: number
    ) {
        super(`Task ${taskId} has ${remainingSteps} incomplete steps`);
        this.name = 'IncompleteStepsError';
    }
}

/**
 * Erreur : Tâche non en cours
 */
export class TaskNotInProgressError extends Error {
    constructor(
        public readonly taskId: string,
        public readonly currentStatus: TaskStatus
    ) {
        super(`Task ${taskId} is not IN_PROGRESS (current: ${currentStatus})`);
        this.name = 'TaskNotInProgressError';
    }
}

/**
 * Erreur : Opérateur non trouvé
 */
export class OperatorNotFoundError extends Error {
    constructor(public readonly operatorId: string) {
        super(`Operator ${operatorId} not found`);
        this.name = 'OperatorNotFoundError';
    }
}

// Re-export enums
export { TaskType, TaskStatus };
