/**
 * Task Controller
 * API pour les tâches WMS Sprint 17
 */

import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { TaskType } from '@prisma/client';
import {
    InvalidScanError,
    TaskNotPendingError,
    TaskNotFoundError,
    OperatorBusyError,
    StepNotFoundError,
    IncompleteStepsError,
    TaskNotInProgressError,
    OperatorNotFoundError
} from '../domain/task.types';

// Request with id param
interface IdRequest extends Request {
    params: { id: string };
}

export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    // ========== CREATE TASK ==========

    /**
     * POST /wms/tasks
     * Crée une nouvelle tâche
     */
    createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { assetId, type } = req.body;

            if (!assetId || !type) {
                res.status(400).json({ error: 'assetId and type are required' });
                return;
            }

            if (!Object.values(TaskType).includes(type)) {
                res.status(400).json({ error: `Invalid task type: ${type}` });
                return;
            }

            const task = await this.taskService.createTask(assetId, type as TaskType);
            res.status(201).json(task);
        } catch (error) {
            next(error);
        }
    };

    // ========== GET NEXT TASK ==========

    /**
     * GET /wms/tasks/next?operatorId=xxx
     * Récupère la prochaine tâche pour un opérateur
     */
    getNextTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { operatorId } = req.query;

            if (!operatorId || typeof operatorId !== 'string') {
                res.status(400).json({ error: 'operatorId query parameter is required' });
                return;
            }

            const task = await this.taskService.getNextTask(operatorId);

            if (!task) {
                res.status(204).send();
                return;
            }

            res.json(task);
        } catch (error) {
            if (error instanceof OperatorNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof OperatorBusyError) {
                res.status(409).json({ error: error.message, currentTaskId: error.currentTaskId });
                return;
            }
            next(error);
        }
    };

    // ========== START TASK ==========

    /**
     * POST /wms/tasks/:id/start
     * Démarre une tâche avec scan obligatoire
     */
    startTask = async (req: IdRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { operatorId, scanCode } = req.body;

            if (!operatorId || !scanCode) {
                res.status(400).json({ error: 'operatorId and scanCode are required' });
                return;
            }

            const task = await this.taskService.startTask(id, { operatorId, scanCode });
            res.json(task);
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof TaskNotPendingError) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error instanceof OperatorNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof OperatorBusyError) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error instanceof InvalidScanError) {
                res.status(422).json({
                    error: error.message,
                    expected: error.expected,
                    received: error.received,
                    blocked: true
                });
                return;
            }
            next(error);
        }
    };

    // ========== EXECUTE STEP ==========

    /**
     * POST /wms/tasks/:id/step
     * Exécute une étape avec scan obligatoire
     */
    executeStep = async (req: IdRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const { stepId, scanCode } = req.body;

            if (!stepId || !scanCode) {
                res.status(400).json({ error: 'stepId and scanCode are required' });
                return;
            }

            const step = await this.taskService.executeStep(id, { stepId, scanCode });
            res.json(step);
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof TaskNotInProgressError) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error instanceof StepNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof InvalidScanError) {
                res.status(422).json({
                    error: error.message,
                    expected: error.expected,
                    received: error.received,
                    blocked: true
                });
                return;
            }
            next(error);
        }
    };

    // ========== COMPLETE TASK ==========

    /**
     * POST /wms/tasks/:id/complete
     * Finalise une tâche
     */
    completeTask = async (req: IdRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;

            const task = await this.taskService.completeTask(id);
            res.json(task);
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            if (error instanceof TaskNotInProgressError) {
                res.status(409).json({ error: error.message });
                return;
            }
            if (error instanceof IncompleteStepsError) {
                res.status(422).json({
                    error: error.message,
                    remainingSteps: error.remainingSteps
                });
                return;
            }
            next(error);
        }
    };

    // ========== GET TASK DETAILS ==========

    /**
     * GET /wms/tasks/:id
     * Récupère une tâche avec ses étapes
     */
    getTask = async (req: IdRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;

            const { task, steps } = await this.taskService.getTaskWithSteps(id);
            res.json({ ...task, steps });
        } catch (error) {
            if (error instanceof TaskNotFoundError) {
                res.status(404).json({ error: error.message });
                return;
            }
            next(error);
        }
    };
}
