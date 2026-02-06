/**
 * API Gateway Service
 * Gestion authentification, scopes - PAS DE RATE LIMITING ARTIFICIEL
 * 
 * RÈGLES :
 * - Une ApiKey = une entreprise
 * - Scopes explicites par endpoint
 * - Isolation tenant stricte
 * - Pas de cache mémoire (tout en base pour traçabilité)
 * - Lock-in propre = par valeur, pas par contrainte technique
 */

import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import {
    ApiScope,
    AuthenticatedClient,
    UnauthorizedError,
    ForbiddenError,
    TenantIsolationError
} from '../domain/apiContract.types';

export class ApiGatewayService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Authentifier une requête API
     */
    async authenticate(apiKey: string): Promise<AuthenticatedClient> {
        if (!apiKey) {
            throw new UnauthorizedError('API key required');
        }

        const client = await this.prisma.apiClient.findUnique({
            where: { apiKey }
        });

        if (!client || !client.active) {
            throw new UnauthorizedError('Invalid or inactive API key');
        }

        // Mettre à jour dernier accès (traçabilité)
        await this.prisma.apiClient.update({
            where: { id: client.id },
            data: { lastAccess: new Date() }
        });

        return {
            id: client.id,
            name: client.name,
            companyId: client.companyId,
            scopes: this.parseScopes(client.scopes),
            rateLimit: client.rateLimit
        };
    }

    /**
     * Vérifier qu'un client a le scope requis
     */
    requireScope(client: AuthenticatedClient, requiredScope: ApiScope): void {
        if (!client.scopes.includes(requiredScope)) {
            throw new ForbiddenError(requiredScope);
        }
    }

    /**
     * Vérifier l'isolation tenant
     */
    enforceTenantIsolation(client: AuthenticatedClient, resourceCompanyId: string): void {
        if (client.companyId !== resourceCompanyId) {
            throw new TenantIsolationError();
        }
    }

    /**
     * Logger un accès API (traçabilité complète)
     */
    async logAccess(
        clientId: string,
        companyId: string,
        endpoint: string,
        method: string,
        statusCode: number
    ): Promise<void> {
        await this.prisma.apiAccessLog.create({
            data: {
                clientId,
                companyId,
                endpoint,
                method,
                statusCode
            }
        });
    }

    /**
     * Créer un client API
     */
    async createApiClient(
        name: string,
        companyId: string,
        scopes: ApiScope[]
    ): Promise<{ id: string; apiKey: string }> {
        const apiKey = this.generateApiKey();

        const client = await this.prisma.apiClient.create({
            data: {
                name,
                companyId,
                apiKey,
                scopes: scopes.join(','),
                active: true
            }
        });

        console.log(`[INTEGRATION] API client created: ${name} for company ${companyId}`);

        return { id: client.id, apiKey };
    }

    // ============================================
    // HELPERS
    // ============================================

    private parseScopes(scopesStr: string): ApiScope[] {
        return scopesStr.split(',').filter(Boolean) as ApiScope[];
    }

    private generateApiKey(): string {
        const prefix = 'pim';
        const random = createHmac('sha256', Date.now().toString())
            .update(Math.random().toString())
            .digest('hex')
            .substring(0, 32);
        return `${prefix}_${random}`;
    }
}
