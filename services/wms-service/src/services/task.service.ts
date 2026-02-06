/**
 * Task Service
 * Logique métier WMS Sprint 17
 * 
 * RÈGLES ABSOLUES :
 * - Aucune action sans scan valide
 * - Aucune modification manuelle de statut
 * - Aucun choix de tâche par l'opérateur
 * - Aucune exécution hors séquence
 * 
 * Le WMS commande, l'opérateur exécute.
 */

import { PrismaClient, TaskType, TaskStatus } from '@prisma/client';
import { TaskRepository } from '../repositories/task.repository';
import { OperatorRepository } from '../repositories/operator.repository';
import { InventoryServiceClient, HttpInventoryServiceClient } from '../integrations/inventory.client';
import { CtoServiceClient, HttpCtoServiceClient } from '../integrations/cto.client';
import {
    emitTaskStarted,
    emitTaskCompleted,
    emitTaskBlocked
} from '../events/wms.events';
import {
    WmsTaskEntity,
    TaskStepEntity,
    CreateTaskDto,
    StartTaskDto,
    ExecuteStepDto,
    TASK_STEP_TEMPLATES,
    InvalidScanError,
    TaskNotPendingError,
    TaskNotFoundError,
    OperatorBusyError,
    StepNotFoundError,
    IncompleteStepsError,
    TaskNotInProgressError,
    OperatorNotFoundError
} from '../domain/task.types';

export class TaskService {
    private readonly taskRepository: TaskRepository;
    private readonly operatorRepository: OperatorRepository;
    private readonly inventoryClient: InventoryServiceClient;
    private readonly ctoClient: CtoServiceClient;

    constructor(
        prisma: PrismaClient,
        inventoryClient?: InventoryServiceClient,
        ctoClient?: CtoServiceClient
    ) {
        this.taskRepository = new TaskRepository(prisma);
        this.operatorRepository = new OperatorRepository(prisma);
        this.inventoryClient = inventoryClient ?? new HttpInventoryServiceClient();
        this.ctoClient = ctoClient ?? new HttpCtoServiceClient();
    }

    // ========== TASK CREATION ==========

    /**
     * Crée une tâche pour un asset avec les étapes prédéfinies
     */
    async createTask(assetId: string, type: TaskType): Promise<WmsTaskEntity> {
        const steps = TASK_STEP_TEMPLATES[type];

        // Pour PICKING, l'expectedCode de la première étape est l'assetId
        const stepsWithExpected = steps.map((step, index) => ({
            ...step,
            expectedCode: step.scanRequired && index === 0 ? assetId : step.expectedCode
        }));

        return this.taskRepository.create({
            assetId,
            type,
            steps: stepsWithExpected
        });
    }

    // ========== TASK ATTRIBUTION ==========

    /**
     * Récupère la prochaine tâche disponible pour un opérateur
     * 
     * L'opérateur NE CHOISIT PAS sa tâche, le WMS l'attribue
     */
    async getNextTask(operatorId: string): Promise<WmsTaskEntity | null> {
        // Vérifier que l'opérateur existe
        const operator = await this.operatorRepository.findById(operatorId);
        if (!operator) {
            throw new OperatorNotFoundError(operatorId);
        }

        // Vérifier que l'opérateur n'a pas de tâche en cours
        const activeTask = await this.taskRepository.findActiveTaskByOperator(operatorId);
        if (activeTask) {
            throw new OperatorBusyError(operatorId, activeTask.id);
        }

        // Retourner la prochaine tâche PENDING
        return this.taskRepository.findNextPending();
    }

    // ========== TASK START (SCAN OBLIGATOIRE) ==========

    /**
     * Démarre une tâche avec scan obligatoire
     * 
     * RÈGLES STRICTES :
     * 1. Tâche doit être PENDING
     * 2. Scan valide = assetId exact
     * 3. Opérateur non engagé ailleurs
     * 4. Statut → IN_PROGRESS
     * 
     * Sinon → BLOCKED
     */
    async startTask(taskId: string, dto: StartTaskDto): Promise<WmsTaskEntity> {
        // 1. Vérifier que la tâche existe
        const task = await this.taskRepository.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        // 2. Vérifier que la tâche est PENDING
        if (task.status !== TaskStatus.PENDING) {
            throw new TaskNotPendingError(taskId, task.status);
        }

        // 3. Vérifier que l'opérateur existe
        const operator = await this.operatorRepository.findById(dto.operatorId);
        if (!operator) {
            throw new OperatorNotFoundError(dto.operatorId);
        }

        // 4. Vérifier que l'opérateur n'est pas occupé
        const activeTask = await this.taskRepository.findActiveTaskByOperator(dto.operatorId);
        if (activeTask) {
            throw new OperatorBusyError(dto.operatorId, activeTask.id);
        }

        // 5. Vérifier le scan (doit correspondre à l'assetId)
        const scanValid = dto.scanCode === task.assetId;

        // Logger le scan
        await this.taskRepository.logScan(taskId, null, dto.scanCode, scanValid);

        // Si scan invalide → BLOCKED
        if (!scanValid) {
            const blockedTask = await this.taskRepository.blockTask(taskId);
            emitTaskBlocked(blockedTask, `Invalid scan: expected ${task.assetId}, received ${dto.scanCode}`);
            throw new InvalidScanError(task.assetId, dto.scanCode);
        }

        // 6. Démarrer la tâche
        const startedTask = await this.taskRepository.startTask(taskId, dto.operatorId);

        // Émettre événement
        emitTaskStarted(startedTask);

        return startedTask;
    }

    // ========== STEP EXECUTION (SCAN OBLIGATOIRE) ==========

    /**
     * Exécute une étape avec scan obligatoire
     * 
     * RÈGLE : Le scan doit correspondre au code attendu
     */
    async executeStep(taskId: string, dto: ExecuteStepDto): Promise<TaskStepEntity> {
        // 1. Vérifier que la tâche existe et est IN_PROGRESS
        const task = await this.taskRepository.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }
        if (task.status !== TaskStatus.IN_PROGRESS) {
            throw new TaskNotInProgressError(taskId, task.status);
        }

        // 2. Vérifier que l'étape existe
        const step = await this.taskRepository.findStepById(dto.stepId);
        if (!step || step.taskId !== taskId) {
            throw new StepNotFoundError(taskId, dto.stepId);
        }

        // 3. Si scan requis, valider
        if (step.scanRequired && step.expectedCode) {
            const scanValid = dto.scanCode === step.expectedCode;

            // Logger le scan
            await this.taskRepository.logScan(taskId, dto.stepId, dto.scanCode, scanValid);

            if (!scanValid) {
                await this.taskRepository.blockTask(taskId);
                emitTaskBlocked(task, `Invalid scan at step ${step.stepOrder}`);
                throw new InvalidScanError(step.expectedCode, dto.scanCode);
            }
        } else if (step.scanRequired) {
            // Scan requis mais pas de code attendu → accepter tout code
            await this.taskRepository.logScan(taskId, dto.stepId, dto.scanCode, true);
        }

        // 4. Compléter l'étape
        return this.taskRepository.completeStep(dto.stepId, dto.scanCode);
    }

    // ========== TASK COMPLETION ==========

    /**
     * Finalise une tâche
     * 
     * RÈGLES :
     * - Toutes les étapes doivent être complétées
     * - Pas de bypass possible
     */
    async completeTask(taskId: string): Promise<WmsTaskEntity> {
        // 1. Vérifier que la tâche existe et est IN_PROGRESS
        const task = await this.taskRepository.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }
        if (task.status !== TaskStatus.IN_PROGRESS) {
            throw new TaskNotInProgressError(taskId, task.status);
        }

        // 2. Vérifier que toutes les étapes sont complétées
        const incompleteCount = await this.taskRepository.countIncompleteSteps(taskId);
        if (incompleteCount > 0) {
            throw new IncompleteStepsError(taskId, incompleteCount);
        }

        // 3. Finaliser la tâche
        const completedTask = await this.taskRepository.completeTask(taskId);

        // Émettre événement
        emitTaskCompleted(completedTask);

        return completedTask;
    }

    // ========== QUERIES ==========

    /**
     * Récupère une tâche avec ses étapes
     */
    async getTaskWithSteps(taskId: string): Promise<{ task: WmsTaskEntity; steps: TaskStepEntity[] }> {
        const task = await this.taskRepository.findById(taskId);
        if (!task) {
            throw new TaskNotFoundError(taskId);
        }

        const steps = await this.taskRepository.findStepsByTaskId(taskId);

        return { task, steps };
    }
}
