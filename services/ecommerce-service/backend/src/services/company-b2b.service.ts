/**
 * Company Service
 * Sprint 12 - Business logic pour Comptes Clients B2B
 */

import { CompanyRepository } from '../repositories/company.repository';
import { UserRepository } from '../repositories/user.repository';
import { Company, CreateCompanyDto, toCompanyResponse, CompanyResponse } from '../domain/company.types';
import {
    User,
    UserWithCompany,
    CreateUserDto,
    UserRole,
    MeResponse,
    toUserResponse,
    UserResponse,
    isValidRole,
    canManageUsers
} from '../domain/user.types';

// ============================================
// Erreurs métier
// ============================================

export class CompanyNotFoundError extends Error {
    constructor(id: string) {
        super(`Company not found: ${id}`);
        this.name = 'CompanyNotFoundError';
    }
}

export class CustomerRefExistsError extends Error {
    constructor(customerRef: string) {
        super(`Customer ref already exists: ${customerRef}`);
        this.name = 'CustomerRefExistsError';
    }
}

export class UserNotFoundError extends Error {
    constructor(identifier: string) {
        super(`User not found: ${identifier}`);
        this.name = 'UserNotFoundError';
    }
}

export class EmailExistsError extends Error {
    constructor(email: string) {
        super(`Email already exists: ${email}`);
        this.name = 'EmailExistsError';
    }
}

export class InvalidRoleError extends Error {
    constructor(role: string) {
        super(`Invalid role: ${role}`);
        this.name = 'InvalidRoleError';
    }
}

export class AccessDeniedError extends Error {
    constructor(message: string = 'Access denied') {
        super(message);
        this.name = 'AccessDeniedError';
    }
}

// ============================================
// Service
// ============================================

export class CompanyService {
    constructor(
        private readonly companyRepo: CompanyRepository,
        private readonly userRepo: UserRepository
    ) { }

    // ----------------------------------------
    // Company operations
    // ----------------------------------------

    /**
     * Crée une nouvelle entreprise (admin interne uniquement)
     */
    async createCompany(dto: CreateCompanyDto): Promise<CompanyResponse> {
        // Vérifier unicité customerRef
        if (await this.companyRepo.existsByCustomerRef(dto.customerRef)) {
            throw new CustomerRefExistsError(dto.customerRef);
        }

        const company = await this.companyRepo.create(dto);
        return toCompanyResponse(company);
    }

    /**
     * Récupère une entreprise par ID
     */
    async getCompany(id: string): Promise<CompanyResponse> {
        const company = await this.companyRepo.findById(id);
        if (!company) {
            throw new CompanyNotFoundError(id);
        }
        return toCompanyResponse(company);
    }

    /**
     * Récupère une entreprise par customerRef
     */
    async getCompanyByCustomerRef(customerRef: string): Promise<CompanyResponse> {
        const company = await this.companyRepo.findByCustomerRef(customerRef);
        if (!company) {
            throw new CompanyNotFoundError(customerRef);
        }
        return toCompanyResponse(company);
    }

    /**
     * Liste toutes les entreprises (admin interne uniquement)
     */
    async listCompanies(): Promise<CompanyResponse[]> {
        const companies = await this.companyRepo.findAll();
        return companies.map(toCompanyResponse);
    }

    // ----------------------------------------
    // User operations
    // ----------------------------------------

    /**
     * Ajoute un utilisateur à une entreprise
     * Requiert: ADMIN_CLIENT de la même entreprise
     */
    async addUser(
        companyId: string,
        dto: CreateUserDto,
        requestingUserRole: UserRole
    ): Promise<UserResponse> {
        // Vérifier permissions
        if (!canManageUsers(requestingUserRole)) {
            throw new AccessDeniedError('Only ADMIN_CLIENT can add users');
        }

        // Vérifier que l'entreprise existe
        const company = await this.companyRepo.findById(companyId);
        if (!company) {
            throw new CompanyNotFoundError(companyId);
        }

        // Vérifier validité du rôle
        if (!isValidRole(dto.role)) {
            throw new InvalidRoleError(dto.role);
        }

        // Vérifier unicité email
        if (await this.userRepo.existsByEmail(dto.email)) {
            throw new EmailExistsError(dto.email);
        }

        const user = await this.userRepo.create(companyId, dto);
        return toUserResponse(user);
    }

    /**
     * Liste les utilisateurs d'une entreprise
     */
    async listUsers(companyId: string): Promise<UserResponse[]> {
        const users = await this.userRepo.findByCompanyId(companyId);
        return users.map(toUserResponse);
    }

    /**
     * Supprime un utilisateur
     * Requiert: ADMIN_CLIENT de la même entreprise
     */
    async removeUser(
        userId: string,
        requestingCompanyId: string,
        requestingUserRole: UserRole
    ): Promise<void> {
        // Vérifier permissions
        if (!canManageUsers(requestingUserRole)) {
            throw new AccessDeniedError('Only ADMIN_CLIENT can remove users');
        }

        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new UserNotFoundError(userId);
        }

        // Vérifier que l'utilisateur appartient à la même entreprise
        if (user.companyId !== requestingCompanyId) {
            throw new AccessDeniedError('Cannot manage users from other companies');
        }

        await this.userRepo.delete(userId);
    }

    // ----------------------------------------
    // Profile operations
    // ----------------------------------------

    /**
     * Récupère le profil de l'utilisateur courant (GET /me)
     */
    async getMe(email: string): Promise<MeResponse> {
        const user = await this.userRepo.findByEmailWithCompany(email);
        if (!user) {
            throw new UserNotFoundError(email);
        }

        return {
            email: user.email,
            role: user.role,
            company: {
                id: user.company.id,
                name: user.company.name,
                customerRef: user.company.customerRef,
                createdAt: user.createdAt.toISOString()
            }
        };
    }

    /**
     * Récupère le profil par keycloakId
     */
    async getMeByKeycloakId(keycloakId: string): Promise<MeResponse> {
        const user = await this.userRepo.findByKeycloakIdWithCompany(keycloakId);
        if (!user) {
            throw new UserNotFoundError(keycloakId);
        }

        return {
            email: user.email,
            role: user.role,
            company: {
                id: user.company.id,
                name: user.company.name,
                customerRef: user.company.customerRef,
                createdAt: user.createdAt.toISOString()
            }
        };
    }

    /**
     * Lie un utilisateur existant à un keycloakId
     * (appelé lors de la première connexion Keycloak)
     */
    async linkKeycloak(email: string, keycloakId: string): Promise<void> {
        const user = await this.userRepo.findByEmail(email);
        if (!user) {
            throw new UserNotFoundError(email);
        }
        await this.userRepo.linkKeycloak(user.id, keycloakId);
    }

    // ----------------------------------------
    // Access control helpers
    // ----------------------------------------

    /**
     * Vérifie qu'un utilisateur appartient à une entreprise
     */
    async verifyCompanyAccess(email: string, companyId: string): Promise<boolean> {
        const user = await this.userRepo.findByEmail(email);
        return user?.companyId === companyId;
    }
}
