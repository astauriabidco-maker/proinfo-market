/**
 * Company Routes
 * Routes pour la gestion des entreprises B2B
 */

import { Router, Request, Response } from 'express';
import { CompanyService, EmailAlreadyExistsError, PermissionDeniedError } from '../services/company.service';
import { authMiddleware, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/company.model';

const companyService = new CompanyService();

export function createCompanyRoutes(): Router {
    const router = Router();

    // Toutes les routes nécessitent une authentification
    router.use(authMiddleware);

    /**
     * GET /companies/me
     * Récupère les informations de l'entreprise de l'utilisateur connecté
     */
    router.get('/me', async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const company = await companyService.getCompanyById(req.user.companyId);
        if (!company) {
            res.status(404).json({ error: 'NotFound', message: 'Company not found' });
            return;
        }

        res.json({
            id: company.id,
            name: company.name,
            customerRef: company.customerRef,
            siren: company.siren,
            address: company.address,
            createdAt: company.createdAt
        });
    });

    /**
     * GET /companies/users
     * Liste les utilisateurs de l'entreprise
     */
    router.get('/users', async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const users = await companyService.getCompanyUsers(req.user.companyId);

        res.json(
            users.map(u => ({
                id: u.id,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                role: u.role,
                createdAt: u.createdAt,
                lastLoginAt: u.lastLoginAt
            }))
        );
    });

    /**
     * POST /companies/users
     * Ajoute un utilisateur à l'entreprise (ADMIN_CLIENT uniquement)
     */
    router.post('/users', requireRole(UserRole.ADMIN_CLIENT), async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            const { email, password, firstName, lastName, role } = req.body;

            if (!email || !password || !role) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'email, password and role are required'
                });
                return;
            }

            // Valider le rôle
            if (!Object.values(UserRole).includes(role)) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: `role must be one of: ${Object.values(UserRole).join(', ')}`
                });
                return;
            }

            const user = await companyService.addUser(
                req.user.companyId,
                { email, password, firstName, lastName, role },
                req.user.userId
            );

            res.status(201).json({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                createdAt: user.createdAt
            });
        } catch (error) {
            if (error instanceof EmailAlreadyExistsError) {
                res.status(409).json({
                    error: 'EmailAlreadyExists',
                    message: error.message
                });
                return;
            }
            if (error instanceof PermissionDeniedError) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    return router;
}
