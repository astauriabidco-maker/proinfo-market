/**
 * Company Routes V2
 * Sprint 12 - API Comptes Clients B2B
 */

import { Router, Request, Response } from 'express';
import {
    authMiddleware,
    requireAdmin
} from '../middleware/keycloak.middleware';
import { CompanyRepository } from '../repositories/company.repository';
import { UserRepository } from '../repositories/user.repository';
import {
    CompanyService,
    CompanyNotFoundError,
    CustomerRefExistsError,
    UserNotFoundError,
    EmailExistsError,
    InvalidRoleError,
    AccessDeniedError
} from '../services/company-b2b.service';
import { UserRole } from '../domain/user.types';

// Type stub for PrismaClient when not installed
interface PrismaClientStub {
    company: unknown;
    user: unknown;
}

export function createCompanyRoutesV2(prisma: PrismaClientStub): Router {
    const router = Router();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyRepo = new CompanyRepository(prisma as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRepo = new UserRepository(prisma as any);
    const service = new CompanyService(companyRepo, userRepo);

    /**
     * POST /companies
     * Crée une nouvelle entreprise
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            const { name, customerRef } = req.body;

            if (!name || !customerRef) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'name and customerRef are required'
                });
                return;
            }

            const company = await service.createCompany({ name, customerRef });
            res.status(201).json(company);
        } catch (error) {
            if (error instanceof CustomerRefExistsError) {
                res.status(409).json({
                    error: 'Conflict',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /companies
     * Liste toutes les entreprises
     */
    router.get('/', async (_req: Request, res: Response) => {
        const companies = await service.listCompanies();
        res.json(companies);
    });

    /**
     * GET /companies/:companyId
     * Récupère une entreprise par ID
     */
    router.get('/:companyId', authMiddleware, async (req: Request, res: Response) => {
        try {
            const companyId = req.params.companyId ?? '';

            if (req.b2bUser?.companyId && req.b2bUser.companyId !== companyId) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: 'Access denied to this company'
                });
                return;
            }

            const company = await service.getCompany(companyId);
            res.json(company);
        } catch (error) {
            if (error instanceof CompanyNotFoundError) {
                res.status(404).json({
                    error: 'NotFound',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /companies/:companyId/users
     * Ajoute un utilisateur à une entreprise
     */
    router.post(
        '/:companyId/users',
        authMiddleware,
        requireAdmin,
        async (req: Request, res: Response) => {
            try {
                const companyId = req.params.companyId ?? '';
                const { email, role } = req.body;

                if (!email || !role) {
                    res.status(400).json({
                        error: 'ValidationError',
                        message: 'email and role are required'
                    });
                    return;
                }

                if (req.b2bUser?.companyId !== companyId) {
                    res.status(403).json({
                        error: 'Forbidden',
                        message: 'Cannot add users to another company'
                    });
                    return;
                }

                const user = await service.addUser(
                    companyId,
                    { email, role },
                    req.b2bUser.role as UserRole
                );

                res.status(201).json(user);
            } catch (error) {
                if (error instanceof CompanyNotFoundError) {
                    res.status(404).json({ error: 'NotFound', message: error.message });
                    return;
                }
                if (error instanceof EmailExistsError) {
                    res.status(409).json({ error: 'Conflict', message: error.message });
                    return;
                }
                if (error instanceof InvalidRoleError) {
                    res.status(400).json({ error: 'ValidationError', message: error.message });
                    return;
                }
                if (error instanceof AccessDeniedError) {
                    res.status(403).json({ error: 'Forbidden', message: error.message });
                    return;
                }
                throw error;
            }
        }
    );

    /**
     * GET /companies/:companyId/users
     * Liste les utilisateurs d'une entreprise
     */
    router.get('/:companyId/users', authMiddleware, async (req: Request, res: Response) => {
        const companyId = req.params.companyId ?? '';

        if (req.b2bUser?.companyId !== companyId) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Access denied to this company'
            });
            return;
        }

        const users = await service.listUsers(companyId);
        res.json(users);
    });

    /**
     * DELETE /companies/:companyId/users/:userId
     * Supprime un utilisateur
     */
    router.delete(
        '/:companyId/users/:userId',
        authMiddleware,
        requireAdmin,
        async (req: Request, res: Response) => {
            try {
                const companyId = req.params.companyId ?? '';
                const userId = req.params.userId ?? '';

                await service.removeUser(userId, companyId, req.b2bUser?.role as UserRole);
                res.status(204).send();
            } catch (error) {
                if (error instanceof UserNotFoundError) {
                    res.status(404).json({ error: 'NotFound', message: error.message });
                    return;
                }
                if (error instanceof AccessDeniedError) {
                    res.status(403).json({ error: 'Forbidden', message: error.message });
                    return;
                }
                throw error;
            }
        }
    );

    return router;
}

/**
 * Route /me séparée
 */
export function createMeRoute(prisma: PrismaClientStub): Router {
    const router = Router();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const companyRepo = new CompanyRepository(prisma as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRepo = new UserRepository(prisma as any);
    const service = new CompanyService(companyRepo, userRepo);

    /**
     * GET /me
     * Récupère le profil de l'utilisateur courant
     */
    router.get('/', authMiddleware, async (req: Request, res: Response) => {
        try {
            if (!req.b2bUser?.email) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User not authenticated'
                });
                return;
            }

            const profile = await service.getMe(req.b2bUser.email);
            res.json(profile);
        } catch (error) {
            if (error instanceof UserNotFoundError) {
                res.status(404).json({
                    error: 'NotFound',
                    message: 'User profile not found'
                });
                return;
            }
            throw error;
        }
    });

    return router;
}
