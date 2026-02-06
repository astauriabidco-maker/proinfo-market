/**
 * Task Service Tests
 * Tests unitaires pour le WMS Sprint 17
 * 
 * Tests OBLIGATOIRES :
 * 1. should_not_start_task_without_valid_scan
 * 2. should_block_task_on_wrong_asset_scan
 * 3. should_assign_operator_to_single_task
 * 4. should_complete_task_only_after_all_steps
 * 5. should_emit_events_on_task_progress
 */

import { TaskService } from '../services/task.service';
import { TaskRepository } from '../repositories/task.repository';
import { OperatorRepository } from '../repositories/operator.repository';
import { TaskType, TaskStatus, PrismaClient } from '@prisma/client';
import {
    InvalidScanError,
    TaskNotPendingError,
    OperatorBusyError,
    IncompleteStepsError,
    OperatorNotFoundError
} from '../domain/task.types';

// Mock PrismaClient
const mockPrisma = {
    wmsTask: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
    },
    taskStep: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn()
    },
    scanLog: {
        create: jest.fn()
    },
    operator: {
        findUnique: jest.fn(),
        count: jest.fn()
    }
} as unknown as PrismaClient;

// Mock console.log pour les événements
jest.spyOn(console, 'log').mockImplementation(() => { });

describe('TaskService', () => {
    let service: TaskService;

    const mockOperator = {
        id: 'operator-1',
        name: 'John Doe',
        badge: 'BADGE-001',
        createdAt: new Date()
    };

    const mockTask = {
        id: 'task-1',
        assetId: 'ASSET-QR-001',
        type: TaskType.PICKING,
        status: TaskStatus.PENDING,
        operatorId: null,
        createdAt: new Date(),
        startedAt: null,
        endedAt: null
    };

    const mockTaskInProgress = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        operatorId: 'operator-1',
        startedAt: new Date()
    };

    const mockSteps = [
        { id: 'step-1', taskId: 'task-1', stepOrder: 1, description: 'Scanner asset', scanRequired: true, expectedCode: 'ASSET-QR-001', scannedCode: null, completed: false, completedAt: null },
        { id: 'step-2', taskId: 'task-1', stepOrder: 2, description: 'Confirmation', scanRequired: false, expectedCode: null, scannedCode: null, completed: false, completedAt: null }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TaskService(mockPrisma);
    });

    // ========== TEST 1 ==========
    describe('should_not_start_task_without_valid_scan', () => {
        test('throws error when no scan provided', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null); // no active task
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.BLOCKED });

            // Act & Assert
            await expect(
                service.startTask('task-1', { operatorId: 'operator-1', scanCode: '' })
            ).rejects.toThrow(InvalidScanError);
        });

        test('requires scan code to match assetId exactly', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.BLOCKED });

            // Act & Assert - wrong scan code
            await expect(
                service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'WRONG-CODE' })
            ).rejects.toThrow(InvalidScanError);

            // Verify scan was logged
            expect(mockPrisma.scanLog.create).toHaveBeenCalled();
        });
    });

    // ========== TEST 2 ==========
    describe('should_block_task_on_wrong_asset_scan', () => {
        test('sets task status to BLOCKED on invalid scan', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.BLOCKED });

            // Act
            try {
                await service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'INVALID-SCAN' });
            } catch (e) {
                // Expected error
            }

            // Assert - task was blocked
            expect(mockPrisma.wmsTask.update).toHaveBeenCalledWith({
                where: { id: 'task-1' },
                data: { status: TaskStatus.BLOCKED }
            });
        });

        test('logs invalid scan in ScanLog', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.BLOCKED });

            // Act
            try {
                await service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'INVALID' });
            } catch (e) {
                // Expected
            }

            // Assert - scan logged with valid=false
            expect(mockPrisma.scanLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    taskId: 'task-1',
                    code: 'INVALID',
                    valid: false
                })
            });
        });
    });

    // ========== TEST 3 ==========
    describe('should_assign_operator_to_single_task', () => {
        test('prevents operator from starting second task', async () => {
            // Arrange
            const existingTask = { ...mockTaskInProgress, id: 'task-existing' };
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(existingTask); // operator has active task

            // Act & Assert
            await expect(
                service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'ASSET-QR-001' })
            ).rejects.toThrow(OperatorBusyError);
        });

        test('getNextTask throws if operator already has active task', async () => {
            // Arrange
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(mockTaskInProgress);

            // Act & Assert
            await expect(
                service.getNextTask('operator-1')
            ).rejects.toThrow(OperatorBusyError);
        });
    });

    // ========== TEST 4 ==========
    describe('should_complete_task_only_after_all_steps', () => {
        test('throws IncompleteStepsError when steps remain', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTaskInProgress);
            (mockPrisma.taskStep.count as jest.Mock).mockResolvedValue(2); // 2 incomplete steps

            // Act & Assert
            await expect(
                service.completeTask('task-1')
            ).rejects.toThrow(IncompleteStepsError);
        });

        test('allows completion when all steps done', async () => {
            // Arrange
            const completedTask = { ...mockTaskInProgress, status: TaskStatus.COMPLETED, endedAt: new Date() };
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTaskInProgress);
            (mockPrisma.taskStep.count as jest.Mock).mockResolvedValue(0); // all steps done
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue(completedTask);

            // Act
            const result = await service.completeTask('task-1');

            // Assert
            expect(result.status).toBe(TaskStatus.COMPLETED);
            expect(mockPrisma.wmsTask.update).toHaveBeenCalledWith({
                where: { id: 'task-1' },
                data: expect.objectContaining({
                    status: TaskStatus.COMPLETED
                })
            });
        });
    });

    // ========== TEST 5 ==========
    describe('should_emit_events_on_task_progress', () => {
        test('emits TaskStarted event on valid start', async () => {
            // Arrange
            const startedTask = { ...mockTask, status: TaskStatus.IN_PROGRESS, operatorId: 'operator-1', startedAt: new Date() };
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue(startedTask);

            // Act
            await service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'ASSET-QR-001' });

            // Assert - event emitted via console.log (structured)
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('"message":"TaskStarted"')
            );
        });

        test('emits TaskCompleted event on completion', async () => {
            // Arrange
            const completedTask = { ...mockTaskInProgress, status: TaskStatus.COMPLETED, endedAt: new Date() };
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTaskInProgress);
            (mockPrisma.taskStep.count as jest.Mock).mockResolvedValue(0);
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue(completedTask);

            // Act
            await service.completeTask('task-1');

            // Assert
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('"message":"TaskCompleted"')
            );
        });

        test('emits TaskBlocked event on invalid scan', async () => {
            // Arrange
            (mockPrisma.wmsTask.findUnique as jest.Mock).mockResolvedValue(mockTask);
            (mockPrisma.operator.findUnique as jest.Mock).mockResolvedValue(mockOperator);
            (mockPrisma.wmsTask.findFirst as jest.Mock).mockResolvedValue(null);
            (mockPrisma.scanLog.create as jest.Mock).mockResolvedValue({});
            (mockPrisma.wmsTask.update as jest.Mock).mockResolvedValue({ ...mockTask, status: TaskStatus.BLOCKED });

            // Act
            try {
                await service.startTask('task-1', { operatorId: 'operator-1', scanCode: 'BAD-SCAN' });
            } catch (e) {
                // Expected
            }

            // Assert
            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('"message":"TaskBlocked"')
            );
        });
    });
});
