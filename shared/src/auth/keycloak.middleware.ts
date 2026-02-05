/**
 * Keycloak OIDC Authentication Middleware
 * Vérifie les JWT et extrait les rôles utilisateur
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';

/**
 * Rôles disponibles dans la plateforme
 */
export enum Role {
    ADMIN = 'ADMIN',
    OPS = 'OPS',
    SAV = 'SAV',
    B2B_CLIENT = 'B2B_CLIENT'
}

/**
 * Payload JWT décodé
 */
export interface JwtPayload {
    sub: string;
    email?: string;
    preferred_username?: string;
    realm_access?: {
        roles: string[];
    };
    resource_access?: Record<string, { roles: string[] }>;
    iat: number;
    exp: number;
}

/**
 * Extension de Request avec les infos utilisateur
 */
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
        username?: string;
        roles: Role[];
    };
}

/**
 * Configuration Keycloak
 */
export interface KeycloakConfig {
    issuer: string;
    jwksUri: string;
    audience?: string;
}

/**
 * Crée un client JWKS pour valider les tokens
 */
function createJwksClient(config: KeycloakConfig): jwksRsa.JwksClient {
    return jwksRsa({
        jwksUri: config.jwksUri,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 10
    });
}

/**
 * Extrait la clé de signature
 */
function getKey(client: jwksRsa.JwksClient) {
    return (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
        if (!header.kid) {
            callback(new Error('No kid in token header'));
            return;
        }
        client.getSigningKey(header.kid, (err, key) => {
            if (err) {
                callback(err);
                return;
            }
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        });
    };
}

/**
 * Extrait les rôles du payload JWT
 */
function extractRoles(payload: JwtPayload, clientId?: string): Role[] {
    const roles: Role[] = [];

    // Roles du realm
    if (payload.realm_access?.roles) {
        for (const role of payload.realm_access.roles) {
            if (Object.values(Role).includes(role as Role)) {
                roles.push(role as Role);
            }
        }
    }

    // Roles du client (resource_access)
    if (clientId && payload.resource_access?.[clientId]?.roles) {
        for (const role of payload.resource_access[clientId].roles) {
            if (Object.values(Role).includes(role as Role)) {
                roles.push(role as Role);
            }
        }
    }

    return [...new Set(roles)]; // Déduplique
}

/**
 * Middleware d'authentification
 * Vérifie le JWT et extrait les informations utilisateur
 */
export function authMiddleware(config: KeycloakConfig, clientId?: string) {
    const jwksClient = createJwksClient(config);

    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
            return;
        }

        const token = authHeader.substring(7);

        try {
            const decoded = await new Promise<JwtPayload>((resolve, reject) => {
                jwt.verify(
                    token,
                    getKey(jwksClient),
                    {
                        issuer: config.issuer,
                        audience: config.audience,
                        algorithms: ['RS256']
                    },
                    (err, decoded) => {
                        if (err) reject(err);
                        else resolve(decoded as JwtPayload);
                    }
                );
            });

            req.user = {
                id: decoded.sub,
                email: decoded.email,
                username: decoded.preferred_username,
                roles: extractRoles(decoded, clientId)
            };

            next();
        } catch (error) {
            res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
        }
    };
}

/**
 * Middleware de contrôle de rôle
 * Vérifie que l'utilisateur a au moins un des rôles requis
 */
export function requireRole(...roles: Role[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated' });
            return;
        }

        const hasRole = roles.some(role => req.user?.roles.includes(role));

        if (!hasRole) {
            res.status(403).json({
                error: 'Forbidden',
                message: `Required roles: ${roles.join(', ')}`,
                userRoles: req.user.roles
            });
            return;
        }

        next();
    };
}

/**
 * Configuration par défaut pour Keycloak local
 */
export function getDefaultKeycloakConfig(): KeycloakConfig {
    const keycloakUrl = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
    const realm = process.env.KEYCLOAK_REALM ?? 'proinfo';

    return {
        issuer: `${keycloakUrl}/realms/${realm}`,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
        audience: process.env.KEYCLOAK_CLIENT_ID
    };
}
