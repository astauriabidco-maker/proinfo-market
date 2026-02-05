/**
 * Auth Routes
 * Routes d'authentification B2B
 */

import { Router, Request, Response } from 'express';
import { CompanyService, EmailAlreadyExistsError, InvalidCredentialsError } from '../services/company.service';
import { authMiddleware } from '../middleware/auth.middleware';

const companyService = new CompanyService();

export function createAuthRoutes(): Router {
    const router = Router();

    /**
     * POST /auth/register
     * Créer un nouveau compte entreprise B2B
     */
    router.post('/register', async (req: Request, res: Response) => {
        try {
            const { name, siren, address, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

            if (!name || !adminEmail || !adminPassword) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'name, adminEmail and adminPassword are required'
                });
                return;
            }

            const result = await companyService.registerCompany({
                name,
                siren,
                address,
                adminEmail,
                adminPassword,
                adminFirstName,
                adminLastName
            });

            res.status(201).json(result);
        } catch (error) {
            if (error instanceof EmailAlreadyExistsError) {
                res.status(409).json({
                    error: 'EmailAlreadyExists',
                    message: error.message
                });
                return;
            }
            throw error;
        }
    });

    /**
     * POST /auth/login
     * Connexion utilisateur
     */
    router.post('/login', async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    error: 'ValidationError',
                    message: 'email and password are required'
                });
                return;
            }

            const result = await companyService.login({ email, password });
            res.json(result);
        } catch (error) {
            if (error instanceof InvalidCredentialsError) {
                res.status(401).json({
                    error: 'InvalidCredentials',
                    message: 'Invalid email or password'
                });
                return;
            }
            throw error;
        }
    });

    /**
     * GET /auth/me
     * Récupère le profil de l'utilisateur connecté
     */
    router.get('/me', authMiddleware, async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await companyService.getUserById(req.user.userId);
        const company = await companyService.getCompanyById(req.user.companyId);

        if (!user || !company) {
            res.status(404).json({ error: 'NotFound', message: 'User or company not found' });
            return;
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            },
            company: {
                id: company.id,
                name: company.name,
                customerRef: company.customerRef,
                siren: company.siren
            }
        });
    });

    return router;
}
