/**
 * Task Routes
 * Routes API pour les tâches WMS Sprint 17
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { TaskController } from '../controllers/task.controller';
import { TaskService } from '../services/task.service';

export function createTaskRoutes(prisma: PrismaClient): Router {
    const router = Router();
    const taskService = new TaskService(prisma);
    const controller = new TaskController(taskService);

    // ========== TASK ROUTES ==========

    /**
     * POST /wms/tasks
     * Crée une nouvelle tâche (appelé par CTO/Order service)
     */
    router.post('/', controller.createTask);

    /**
     * GET /wms/tasks/next?operatorId=xxx
     * Récupère la prochaine tâche pour un opérateur
     */
    router.get('/next', controller.getNextTask);

    /**
     * GET /wms/tasks/:id
     * Récupère une tâche avec ses étapes
     */
    router.get('/:id', controller.getTask);

    /**
     * POST /wms/tasks/:id/start
     * Démarre une tâche avec scan obligatoire
     * Body: { operatorId, scanCode }
     */
    router.post('/:id/start', controller.startTask);

    /**
     * POST /wms/tasks/:id/step
     * Exécute une étape avec scan obligatoire
     * Body: { stepId, scanCode }
     */
    router.post('/:id/step', controller.executeStep);

    /**
     * POST /wms/tasks/:id/complete
     * Finalise une tâche
     */
    router.post('/:id/complete', controller.completeTask);

    /**
     * GET /wms/tasks/stats
     * Stats pour observabilité service
     */
    router.get('/stats', async (req, res) => {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Stats des tâches du jour
            const [blockedTasks, totalTasks, completedTasks] = await Promise.all([
                prisma.wmsTask.count({
                    where: { status: 'BLOCKED' }
                }),
                prisma.wmsTask.count({
                    where: { createdAt: { gte: todayStart } }
                }),
                prisma.wmsTask.count({
                    where: {
                        status: 'COMPLETED',
                        endedAt: { gte: todayStart }
                    }
                })
            ]);

            // Calculer temps moyen de tâche (en minutes)
            const completedTasksWithTime = await prisma.wmsTask.findMany({
                where: {
                    status: 'COMPLETED',
                    startedAt: { not: null },
                    endedAt: { gte: todayStart }
                },
                select: { startedAt: true, endedAt: true }
            });

            let avgTaskTime = 0;
            if (completedTasksWithTime.length > 0) {
                const totalTime = completedTasksWithTime.reduce((sum, task) => {
                    if (task.startedAt && task.endedAt) {
                        return sum + (task.endedAt.getTime() - task.startedAt.getTime());
                    }
                    return sum;
                }, 0);
                avgTaskTime = Math.round((totalTime / completedTasksWithTime.length) / 60000); // en minutes
            }

            // Taux de rework QA (tasks QA refaites)
            const qaTasks = await prisma.wmsTask.count({
                where: { type: 'QA', createdAt: { gte: todayStart } }
            });
            const qaReworkRate = qaTasks > 0 ? 0 : 0; // Simplifié

            res.json({
                success: true,
                avgTaskTime,
                blockedTasks,
                qaReworkRate,
                totalTasks,
                completedTasks
            });
        } catch (error: any) {
            console.error('[WMS] Stats error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    return router;
}
