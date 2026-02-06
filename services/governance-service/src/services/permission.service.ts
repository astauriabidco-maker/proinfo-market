/**
 * Permission Service
 * Vérification des permissions
 * 
 * RÈGLES :
 * - Pas de permissions implicites
 * - Pas de super-admin
 * - Toute action critique tracée
 */

import { PrismaClient } from '@prisma/client';
import {
    PermissionCode,
    CRITICAL_PERMISSIONS,
    PermissionDeniedError,
    UnauthorizedOverrideError
} from '../domain/permission.types';
import { DecisionLogService } from './decisionLog.service';

export class PermissionService {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly decisionLogService?: DecisionLogService
    ) { }

    /**
     * Vérifier si un utilisateur a une permission
     * Vérifie : rôles + délégations actives
     */
    async hasPermission(userId: string, permissionCode: PermissionCode): Promise<boolean> {
        // 1. Vérifier via rôles
        const viaRole = await this.hasPermissionViaRole(userId, permissionCode);
        if (viaRole) return true;

        // 2. Vérifier via délégation active
        const viaDelegation = await this.hasPermissionViaDelegation(userId, permissionCode);
        return viaDelegation;
    }

    /**
     * Vérifier permission via rôle
     */
    private async hasPermissionViaRole(userId: string, permissionCode: PermissionCode): Promise<boolean> {
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        for (const ur of userRoles) {
            for (const rp of ur.role.permissions) {
                if (rp.permission.code === permissionCode) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Vérifier permission via délégation active
     */
    private async hasPermissionViaDelegation(userId: string, permissionCode: PermissionCode): Promise<boolean> {
        const now = new Date();

        const delegation = await this.prisma.delegation.findFirst({
            where: {
                toUserId: userId,
                active: true,
                permission: { code: permissionCode },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
            },
            include: { permission: true }
        });

        return !!delegation;
    }

    /**
     * Exiger une permission (throw si non autorisé)
     * RÈGLE : Pas de bypass
     */
    async requirePermission(
        userId: string,
        permissionCode: PermissionCode,
        context?: { entityType?: string; entityId?: string; reason?: string }
    ): Promise<{ allowed: true; delegatedBy?: string }> {
        const hasDirectPermission = await this.hasPermissionViaRole(userId, permissionCode);

        if (hasDirectPermission) {
            // Logger si action critique
            if (CRITICAL_PERMISSIONS.includes(permissionCode) && this.decisionLogService) {
                await this.decisionLogService.logDecision({
                    actorId: userId,
                    action: permissionCode,
                    entityType: context?.entityType,
                    entityId: context?.entityId,
                    context: context?.reason ? { reason: context.reason } : undefined
                });
            }
            return { allowed: true };
        }

        // Vérifier délégation
        const delegation = await this.prisma.delegation.findFirst({
            where: {
                toUserId: userId,
                active: true,
                permission: { code: permissionCode },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });

        if (delegation) {
            // Logger avec délégation
            if (CRITICAL_PERMISSIONS.includes(permissionCode) && this.decisionLogService) {
                await this.decisionLogService.logDecision({
                    actorId: userId,
                    action: permissionCode,
                    entityType: context?.entityType,
                    entityId: context?.entityId,
                    delegatedBy: delegation.fromUserId,
                    context: { reason: context?.reason, viaDelegation: true }
                });
            }
            return { allowed: true, delegatedBy: delegation.fromUserId };
        }

        throw new PermissionDeniedError(userId, permissionCode);
    }

    /**
     * Bloquer toute tentative de bypass
     * RÈGLE ABSOLUE : Pas de super-admin, pas de bypass
     */
    attemptOverride(): never {
        throw new UnauthorizedOverrideError();
    }

    /**
     * Récupérer les permissions d'un utilisateur
     */
    async getUserPermissions(userId: string): Promise<PermissionCode[]> {
        const permissions: Set<PermissionCode> = new Set();

        // Via rôles
        const userRoles = await this.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { permission: true }
                        }
                    }
                }
            }
        });

        for (const ur of userRoles) {
            for (const rp of ur.role.permissions) {
                permissions.add(rp.permission.code as PermissionCode);
            }
        }

        // Via délégations actives
        const delegations = await this.prisma.delegation.findMany({
            where: {
                toUserId: userId,
                active: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: { permission: true }
        });

        for (const d of delegations) {
            permissions.add(d.permission.code as PermissionCode);
        }

        return Array.from(permissions);
    }
}
