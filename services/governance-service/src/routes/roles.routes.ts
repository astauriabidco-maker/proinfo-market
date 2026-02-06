/**
 * Roles Routes
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /roles
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const roles = await prisma.role.findMany({
            include: { permissions: { include: { permission: true } } }
        });
        res.json({ data: roles });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

/**
 * POST /roles
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, level } = req.body;
        const role = await prisma.role.create({
            data: { name, description, level }
        });
        res.status(201).json({ data: role });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create role' });
    }
});

/**
 * POST /roles/:id/permissions
 */
router.post('/:id/permissions', async (req: Request, res: Response): Promise<void> => {
    try {
        const { permissionCode } = req.body;
        const permission = await prisma.permission.findUnique({
            where: { code: permissionCode }
        });

        if (!permission) {
            res.status(404).json({ error: 'Permission not found' });
            return;
        }

        await prisma.rolePermission.create({
            data: { roleId: req.params.id, permissionId: permission.id }
        });

        res.json({ data: { added: true } });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add permission' });
    }
});

export default router;
