/**
 * Auth Middleware
 * Middleware d'authentification API
 */

import { Request, Response, NextFunction } from 'express';
import { ApiGatewayService } from '../services/apiGateway.service';
import { AuthenticatedClient, ApiScope, API_VERSION } from '../domain/apiContract.types';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            apiClient?: AuthenticatedClient;
            requestId?: string;
        }
    }
}

export function createAuthMiddleware(gateway: ApiGatewayService) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        req.requestId = requestId;

        try {
            // Extraire API key
            const apiKey = req.headers['x-api-key'] as string ||
                req.headers['authorization']?.replace('Bearer ', '');

            if (!apiKey) {
                res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'API key required' },
                    meta: { apiVersion: API_VERSION, requestId, timestamp: new Date().toISOString() }
                });
                return;
            }

            // Authentifier
            const client = await gateway.authenticate(apiKey);
            req.apiClient = client;

            // Pas de rate limiting artificiel - lock-in propre
            // Les limites techniques sont documentées, pas imposées

            next();
        } catch (error: any) {
            if (error.name === 'UnauthorizedError') {
                res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: error.message },
                    meta: { apiVersion: API_VERSION, requestId, timestamp: new Date().toISOString() }
                });
                return;
            }
            res.status(500).json({
                error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
                meta: { apiVersion: API_VERSION, requestId, timestamp: new Date().toISOString() }
            });
        }
    };
}

export function requireScope(gateway: ApiGatewayService, scope: ApiScope) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.apiClient) {
                res.status(401).json({
                    error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
                    meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
                });
                return;
            }

            gateway.requireScope(req.apiClient, scope);
            next();
        } catch (error: any) {
            if (error.name === 'ForbiddenError') {
                res.status(403).json({
                    error: { code: 'FORBIDDEN', message: error.message },
                    meta: { apiVersion: API_VERSION, requestId: req.requestId, timestamp: new Date().toISOString() }
                });
                return;
            }
            next(error);
        }
    };
}
