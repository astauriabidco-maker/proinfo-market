/**
 * Auth Middleware
 * Vérification JWT et injection du contexte utilisateur
 */

import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/company.service';
import { JwtPayload, UserRole } from '../models/company.model';

// Étendre le type Request pour inclure le contexte utilisateur
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

const companyService = new CompanyService();

/**
 * Middleware d'authentification
 * Vérifie le token JWT et injecte req.user
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        return;
    }

    const token = authHeader.substring(7);

    try {
        const payload = companyService.verifyToken(token);
        req.user = payload;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
}

/**
 * Middleware de vérification de rôle
 * Vérifie que l'utilisateur a un des rôles autorisés
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
            return;
        }

        next();
    };
}

/**
 * Middleware pour vérifier que l'utilisateur peut commander
 * (ADMIN_CLIENT ou ACHETEUR)
 */
export function canOrder(req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
        return;
    }

    if (req.user.role === UserRole.LECTURE) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Role LECTURE cannot create orders or quotes'
        });
        return;
    }

    next();
}

/**
 * Récupère le customerRef du contexte utilisateur
 * Utilisé pour isoler les données par entreprise
 */
export function getCustomerRef(req: Request): string | null {
    return req.user?.customerRef ?? null;
}

/**
 * Récupère le companyId du contexte utilisateur
 */
export function getCompanyId(req: Request): string | null {
    return req.user?.companyId ?? null;
}
