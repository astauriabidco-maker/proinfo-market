/**
 * User Repository
 * Sprint 12 - Accès données User via Prisma
 */

import { PrismaClient, User as PrismaUser, UserRole as PrismaUserRole } from '@prisma/client';
import { User, UserWithCompany, CreateUserDto, UpdateUserDto, UserRole } from '../domain/user.types';

export class UserRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un nouvel utilisateur dans une entreprise
     */
    async create(companyId: string, dto: CreateUserDto): Promise<User> {
        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                role: dto.role as PrismaUserRole,
                companyId
            }
        });
        return this.toDomain(user);
    }

    /**
     * Trouve un utilisateur par ID
     */
    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id }
        });
        return user ? this.toDomain(user) : null;
    }

    /**
     * Trouve un utilisateur par email
     */
    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
        return user ? this.toDomain(user) : null;
    }

    /**
     * Trouve un utilisateur par keycloakId
     */
    async findByKeycloakId(keycloakId: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { keycloakId }
        });
        return user ? this.toDomain(user) : null;
    }

    /**
     * Trouve un utilisateur avec sa Company
     */
    async findByEmailWithCompany(email: string): Promise<UserWithCompany | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        customerRef: true
                    }
                }
            }
        });

        if (!user) return null;

        return {
            ...this.toDomain(user),
            company: user.company
        };
    }

    /**
     * Trouve un utilisateur par keycloakId avec sa Company
     */
    async findByKeycloakIdWithCompany(keycloakId: string): Promise<UserWithCompany | null> {
        const user = await this.prisma.user.findUnique({
            where: { keycloakId },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        customerRef: true
                    }
                }
            }
        });

        if (!user) return null;

        return {
            ...this.toDomain(user),
            company: user.company
        };
    }

    /**
     * Met à jour un utilisateur
     */
    async update(id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: dto.role ? { role: dto.role as PrismaUserRole } : {}
        });
        return this.toDomain(user);
    }

    /**
     * Lie un utilisateur à un keycloakId
     */
    async linkKeycloak(id: string, keycloakId: string): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data: { keycloakId }
        });
        return this.toDomain(user);
    }

    /**
     * Supprime un utilisateur
     */
    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({
            where: { id }
        });
    }

    /**
     * Liste les utilisateurs d'une entreprise
     */
    async findByCompanyId(companyId: string): Promise<User[]> {
        const users = await this.prisma.user.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        return users.map(u => this.toDomain(u));
    }

    /**
     * Vérifie si un email existe déjà
     */
    async existsByEmail(email: string): Promise<boolean> {
        const count = await this.prisma.user.count({
            where: { email: email.toLowerCase() }
        });
        return count > 0;
    }

    /**
     * Convertit Prisma User en domain User
     */
    private toDomain(prismaUser: PrismaUser): User {
        return {
            id: prismaUser.id,
            email: prismaUser.email,
            keycloakId: prismaUser.keycloakId,
            role: prismaUser.role as UserRole,
            companyId: prismaUser.companyId,
            createdAt: prismaUser.createdAt,
            updatedAt: prismaUser.updatedAt
        };
    }
}
