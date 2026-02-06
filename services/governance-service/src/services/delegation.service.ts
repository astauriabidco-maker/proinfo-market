/**
 * Delegation Service
 * Délégation temporaire et contrôlée
 * 
 * RÈGLES :
 * - Traçable
 * - Révocable
 * - Avec expiration
 */

import { PrismaClient } from '@prisma/client';
import {
    DelegationEntity,
    DelegationView,
    CreateDelegationDto,
    DelegationNotFoundError,
    DelegationExpiredError,
    CannotDelegateError
} from '../domain/delegation.types';
import { PermissionCode } from '../domain/permission.types';

export class DelegationService {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Créer une délégation temporaire
     */
    async createDelegation(dto: CreateDelegationDto): Promise<DelegationView> {
        // Vérifier que le délégateur a la permission à déléguer
        const permission = await this.prisma.permission.findUnique({
            where: { code: dto.permissionCode }
        });

        if (!permission) {
            throw new CannotDelegateError(`Permission ${dto.permissionCode} not found`);
        }

        // Vérifier que le délégateur a bien cette permission
        const delegatorHasPermission = await this.checkDelegatorHasPermission(
            dto.fromUserId,
            dto.permissionCode as PermissionCode
        );

        if (!delegatorHasPermission) {
            throw new CannotDelegateError('Cannot delegate a permission you do not have');
        }

        const delegation = await this.prisma.$transaction(async (tx) => {
            const created = await tx.delegation.create({
                data: {
                    fromUserId: dto.fromUserId,
                    toUserId: dto.toUserId,
                    permissionId: permission.id,
                    reason: dto.reason || null,
                    expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                    active: true
                },
                include: { permission: true }
            });

            // Logger l'événement
            await tx.governanceEvent.create({
                data: {
                    eventType: 'PermissionDelegated',
                    actorId: dto.fromUserId,
                    targetId: dto.toUserId,
                    data: JSON.stringify({
                        permissionCode: dto.permissionCode,
                        expiresAt: dto.expiresAt
                    })
                }
            });

            return created;
        });

        console.log(`[GOVERNANCE] Permission ${dto.permissionCode} delegated from ${dto.fromUserId} to ${dto.toUserId}`);

        return this.toView(delegation);
    }

    /**
     * Révoquer une délégation
     */
    async revokeDelegation(delegationId: string, revokedBy: string): Promise<void> {
        const delegation = await this.prisma.delegation.findUnique({
            where: { id: delegationId }
        });

        if (!delegation) {
            throw new DelegationNotFoundError(delegationId);
        }

        await this.prisma.$transaction(async (tx) => {
            await tx.delegation.update({
                where: { id: delegationId },
                data: {
                    active: false,
                    revokedAt: new Date(),
                    revokedBy
                }
            });

            await tx.governanceEvent.create({
                data: {
                    eventType: 'DelegationRevoked',
                    actorId: revokedBy,
                    targetId: delegation.toUserId,
                    data: JSON.stringify({ delegationId })
                }
            });
        });

        console.log(`[GOVERNANCE] Delegation ${delegationId} revoked by ${revokedBy}`);
    }

    /**
     * Expirer les délégations échues
     * Appelé par cron
     */
    async expireExpiredDelegations(): Promise<number> {
        const now = new Date();

        const expired = await this.prisma.delegation.findMany({
            where: {
                active: true,
                expiresAt: { lte: now }
            }
        });

        for (const d of expired) {
            await this.prisma.$transaction(async (tx) => {
                await tx.delegation.update({
                    where: { id: d.id },
                    data: { active: false }
                });

                await tx.governanceEvent.create({
                    data: {
                        eventType: 'DelegationExpired',
                        actorId: 'SYSTEM',
                        targetId: d.toUserId,
                        data: JSON.stringify({ delegationId: d.id })
                    }
                });
            });

            console.log(`[GOVERNANCE] Delegation ${d.id} expired automatically`);
        }

        return expired.length;
    }

    /**
     * Récupérer les délégations actives d'un utilisateur (données)
     */
    async getActiveDelegationsTo(userId: string): Promise<DelegationView[]> {
        const now = new Date();

        const delegations = await this.prisma.delegation.findMany({
            where: {
                toUserId: userId,
                active: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: now } }
                ]
            },
            include: { permission: true },
            orderBy: { createdAt: 'desc' }
        });

        return delegations.map(d => this.toView(d));
    }

    /**
     * Récupérer les délégations accordées par un utilisateur
     */
    async getDelegationsFrom(userId: string): Promise<DelegationView[]> {
        const delegations = await this.prisma.delegation.findMany({
            where: { fromUserId: userId },
            include: { permission: true },
            orderBy: { createdAt: 'desc' }
        });

        return delegations.map(d => this.toView(d));
    }

    /**
     * Vérifier si une délégation est expirée
     */
    isDelegationExpired(delegation: DelegationEntity): boolean {
        if (!delegation.expiresAt) return false;
        return delegation.expiresAt <= new Date();
    }

    // ============================================
    // HELPERS
    // ============================================

    private async checkDelegatorHasPermission(userId: string, permissionCode: PermissionCode): Promise<boolean> {
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

    private toView(delegation: any): DelegationView {
        const now = new Date();
        const expired = delegation.expiresAt && delegation.expiresAt <= now;

        return {
            id: delegation.id,
            fromUserId: delegation.fromUserId,
            toUserId: delegation.toUserId,
            permissionCode: delegation.permission?.code || 'UNKNOWN',
            reason: delegation.reason,
            expiresAt: delegation.expiresAt?.toISOString() || null,
            active: delegation.active && !expired,
            expired,
            createdAt: delegation.createdAt.toISOString()
        };
    }
}
