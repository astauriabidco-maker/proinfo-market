/**
 * Keycloak Auth Middleware
 * Sprint 12 - Authentification via Keycloak OIDC
 * 
 * Note: Uses its own request property (keycloakUser) to avoid conflicts
 * with the existing auth.middleware.ts (req.user)
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { UserRole } from '../domain/user.types';

// ============================================
// Configuration Keycloak
// ============================================

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'proinfo-market';

// ============================================
// Types
// ============================================

export interface KeycloakTokenPayload {
    sub: string;          // Keycloak user ID
    email: string;
    email_verified: boolean;
    preferred_username: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [clientId: string]: {
            roles: string[];
        };
    };
    iat: number;
    exp: number;
    iss: string;
    aud: string | string[];
}

export interface B2BAuthenticatedUser {
    keycloakId: string;
    email: string;
    name?: string;
    // These are populated from our DB, not Keycloak
    userId?: string;
    role?: UserRole;
    companyId?: string;
    customerRef?: string;
}

// Extend Express Request with b2bUser
declare global {
    namespace Express {
        interface Request {
            b2bUser?: B2BAuthenticatedUser;
        }
    }
}

// ============================================
// JWKS Client (lazy loaded)
// ============================================

let jwksClient: {
    getSigningKey: (kid: string | undefined, callback: (err: Error | null, key?: { getPublicKey: () => string }) => void) => void;
} | null = null;

async function getJwksClient() {
    if (!jwksClient) {
        // Dynamic import to avoid issues when jwks-rsa is not installed
        try {
            const jwksRsa = await import('jwks-rsa');
            jwksClient = jwksRsa.default({
                jwksUri: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
                cache: true,
                cacheMaxAge: 86400000 // 24h
            });
        } catch {
            // Fallback for dev mode without jwks-rsa
            return null;
        }
    }
    return jwksClient;
}

// ============================================
// Middleware
// ============================================

/**
 * Récupère la clé publique Keycloak pour vérifier le JWT
 */
function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
    getJwksClient().then(client => {
        if (!client) {
            callback(new Error('JWKS client not available'));
            return;
        }
        client.getSigningKey(header.kid, (err: Error | null, key?: { getPublicKey: () => string }) => {
            if (err) {
                callback(err);
                return;
            }
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        });
    });
}

/**
 * Middleware d'authentification Keycloak (production)
 * Vérifie le JWT et extrait les informations utilisateur
 */
export function keycloakAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
        });
        return;
    }

    const token = authHeader.substring(7);

    jwt.verify(
        token,
        getSigningKey,
        {
            issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
            algorithms: ['RS256']
        },
        (err, decoded) => {
            if (err) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token'
                });
                return;
            }

            const payload = decoded as KeycloakTokenPayload;

            req.b2bUser = {
                keycloakId: payload.sub,
                email: payload.email,
                name: payload.name || payload.preferred_username
            };

            next();
        }
    );
}

/**
 * Middleware simplifié pour dev/test (sans Keycloak)
 * Utilise un JWT simple signé localement
 */
export function devAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'No token provided'
        });
        return;
    }

    const token = authHeader.substring(7);

    try {
        const secret = process.env.JWT_SECRET || 'dev-secret-sprint-12';
        const decoded = jwt.verify(token, secret) as {
            keycloakId: string;
            email: string;
            userId: string;
            role: UserRole;
            companyId: string;
            customerRef: string;
        };

        req.b2bUser = {
            keycloakId: decoded.keycloakId,
            email: decoded.email,
            userId: decoded.userId,
            role: decoded.role,
            companyId: decoded.companyId,
            customerRef: decoded.customerRef
        };

        next();
    } catch {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid token'
        });
    }
}

/**
 * Sélectionne le bon middleware selon l'environnement
 */
export const authMiddleware = process.env.NODE_ENV === 'production'
    ? keycloakAuth
    : devAuth;

// ============================================
// Guards
// ============================================

/**
 * Vérifie que l'utilisateur a le rôle requis
 */
export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.b2bUser?.role) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'User role not found'
            });
            return;
        }

        if (!roles.includes(req.b2bUser.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Required role: ${roles.join(' or ')}`
            });
            return;
        }

        next();
    };
}

/**
 * Vérifie que l'utilisateur peut créer des devis/commandes
 */
export function canOrder(req: Request, res: Response, next: NextFunction): void {
    const allowedRoles = [UserRole.ADMIN_CLIENT, UserRole.ACHETEUR];

    if (!req.b2bUser?.role || !allowedRoles.includes(req.b2bUser.role)) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Ordering requires ADMIN_CLIENT or ACHETEUR role'
        });
        return;
    }

    next();
}

/**
 * Vérifie que l'utilisateur est ADMIN_CLIENT
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    if (req.b2bUser?.role !== UserRole.ADMIN_CLIENT) {
        res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required'
        });
        return;
    }

    next();
}

// ============================================
// Helpers
// ============================================

/**
 * Génère un token de dev pour les tests
 */
export function generateDevToken(user: {
    keycloakId: string;
    email: string;
    userId: string;
    role: UserRole;
    companyId: string;
    customerRef: string;
}): string {
    const secret = process.env.JWT_SECRET || 'dev-secret-sprint-12';
    return jwt.sign(user, secret, { expiresIn: '24h' });
}
