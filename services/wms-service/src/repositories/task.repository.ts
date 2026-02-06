/**
 * Task Repository
 * Accès données pour WmsTask, TaskStep, ScanLog
 * 
 * RÈGLE : Append-only pour ScanLog
 */

import { PrismaClient, WmsTask, TaskStep, ScanLog, TaskStatus, TaskType } from '@prisma/client';
import {
    WmsTaskEntity,
    TaskStepEntity,
    ScanLogEntity,
    CreateTaskDto,
    CreateTaskStepDto
} from '../domain/task.types';

export class TaskRepository {
    constructor(private readonly prisma: PrismaClient) { }

    // ========== TASK CRUD ==========

    /**
     * Crée une tâche avec ses étapes
     */
    async create(dto: CreateTaskDto): Promise<WmsTaskEntity> {
        const task = await this.prisma.wmsTask.create({
            data: {
                assetId: dto.assetId,
                type: dto.type,
                status: TaskStatus.PENDING,
                steps: {
                    create: dto.steps.map(step => ({
                        stepOrder: step.stepOrder,
                        description: step.description,
                        scanRequired: step.scanRequired ?? true,
                        expectedCode: step.expectedCode ?? null
                    }))
                }
            }
        });
        return this.toTaskEntity(task);
    }

    /**
     * Récupère une tâche par ID
     */
    async findById(taskId: string): Promise<WmsTaskEntity | null> {
        const task = await this.prisma.wmsTask.findUnique({
            where: { id: taskId }
        });
        return task ? this.toTaskEntity(task) : null;
    }

    /**
     * Récupère la prochaine tâche PENDING
     */
    async findNextPending(): Promise<WmsTaskEntity | null> {
        const task = await this.prisma.wmsTask.findFirst({
            where: { status: TaskStatus.PENDING },
            orderBy: { createdAt: 'asc' }
        });
        return task ? this.toTaskEntity(task) : null;
    }

    /**
     * Vérifie si un opérateur a une tâche IN_PROGRESS
     */
    async findActiveTaskByOperator(operatorId: string): Promise<WmsTaskEntity | null> {
        const task = await this.prisma.wmsTask.findFirst({
            where: {
                operatorId,
                status: TaskStatus.IN_PROGRESS
            }
        });
        return task ? this.toTaskEntity(task) : null;
    }

    /**
     * Démarre une tâche (PENDING → IN_PROGRESS)
     */
    async startTask(taskId: string, operatorId: string): Promise<WmsTaskEntity> {
        const task = await this.prisma.wmsTask.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.IN_PROGRESS,
                operatorId,
                startedAt: new Date()
            }
        });
        return this.toTaskEntity(task);
    }

    /**
     * Termine une tâche (IN_PROGRESS → COMPLETED)
     */
    async completeTask(taskId: string): Promise<WmsTaskEntity> {
        const task = await this.prisma.wmsTask.update({
            where: { id: taskId },
            data: {
                status: TaskStatus.COMPLETED,
                endedAt: new Date()
            }
        });
        return this.toTaskEntity(task);
    }

    /**
     * Bloque une tâche
     */
    async blockTask(taskId: string): Promise<WmsTaskEntity> {
        const task = await this.prisma.wmsTask.update({
            where: { id: taskId },
            data: { status: TaskStatus.BLOCKED }
        });
        return this.toTaskEntity(task);
    }

    // ========== STEPS ==========

    /**
     * Récupère les étapes d'une tâche
     */
    async findStepsByTaskId(taskId: string): Promise<TaskStepEntity[]> {
        const steps = await this.prisma.taskStep.findMany({
            where: { taskId },
            orderBy: { stepOrder: 'asc' }
        });
        return steps.map(s => this.toStepEntity(s));
    }

    /**
     * Récupère une étape par ID
     */
    async findStepById(stepId: string): Promise<TaskStepEntity | null> {
        const step = await this.prisma.taskStep.findUnique({
            where: { id: stepId }
        });
        return step ? this.toStepEntity(step) : null;
    }

    /**
     * Complète une étape avec le code scanné
     */
    async completeStep(stepId: string, scannedCode: string): Promise<TaskStepEntity> {
        const step = await this.prisma.taskStep.update({
            where: { id: stepId },
            data: {
                scannedCode,
                completed: true,
                completedAt: new Date()
            }
        });
        return this.toStepEntity(step);
    }

    /**
     * Compte les étapes incomplètes
     */
    async countIncompleteSteps(taskId: string): Promise<number> {
        return this.prisma.taskStep.count({
            where: { taskId, completed: false }
        });
    }

    // ========== SCAN LOGS (Append-only) ==========

    /**
     * Enregistre un scan (append-only)
     */
    async logScan(taskId: string, stepId: string | null, code: string, valid: boolean): Promise<ScanLogEntity> {
        const log = await this.prisma.scanLog.create({
            data: { taskId, stepId, code, valid }
        });
        return this.toScanLogEntity(log);
    }

    /**
     * Récupère les logs de scan d'une tâche
     */
    async findScansByTaskId(taskId: string): Promise<ScanLogEntity[]> {
        const logs = await this.prisma.scanLog.findMany({
            where: { taskId },
            orderBy: { scannedAt: 'asc' }
        });
        return logs.map(l => this.toScanLogEntity(l));
    }

    // ========== ENTITY MAPPERS ==========

    private toTaskEntity(task: WmsTask): WmsTaskEntity {
        return {
            id: task.id,
            assetId: task.assetId,
            type: task.type,
            status: task.status,
            operatorId: task.operatorId,
            createdAt: task.createdAt,
            startedAt: task.startedAt,
            endedAt: task.endedAt
        };
    }

    private toStepEntity(step: TaskStep): TaskStepEntity {
        return {
            id: step.id,
            taskId: step.taskId,
            stepOrder: step.stepOrder,
            description: step.description,
            scanRequired: step.scanRequired,
            expectedCode: step.expectedCode,
            scannedCode: step.scannedCode,
            completed: step.completed,
            completedAt: step.completedAt
        };
    }

    private toScanLogEntity(log: ScanLog): ScanLogEntity {
        return {
            id: log.id,
            taskId: log.taskId,
            stepId: log.stepId,
            code: log.code,
            valid: log.valid,
            scannedAt: log.scannedAt
        };
    }
}
