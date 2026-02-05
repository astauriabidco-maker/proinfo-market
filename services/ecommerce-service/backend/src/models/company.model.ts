/**
 * Company Model
 * Modèles pour les comptes entreprise B2B
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Rôles utilisateur B2B
 */
export enum UserRole {
    ADMIN_CLIENT = 'ADMIN_CLIENT',   // Peut gérer les utilisateurs et commander
    ACHETEUR = 'ACHETEUR',           // Peut commander et créer des devis
    LECTURE = 'LECTURE'              // Peut voir mais pas commander
}

/**
 * Entreprise B2B
 */
export interface Company {
    id: string;
    customerRef: string;        // Lien avec OrderService existant
    name: string;
    siren?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Utilisateur rattaché à une entreprise
 */
export interface CompanyUser {
    id: string;
    companyId: string;
    email: string;
    passwordHash: string;       // Hash bcrypt
    firstName?: string;
    lastName?: string;
    role: UserRole;
    createdAt: Date;
    lastLoginAt?: Date;
}

/**
 * DTO pour créer une entreprise
 */
export interface CreateCompanyDto {
    name: string;
    siren?: string;
    address?: string;
    // L'admin initial
    adminEmail: string;
    adminPassword: string;
    adminFirstName?: string;
    adminLastName?: string;
}

/**
 * DTO pour créer un utilisateur
 */
export interface CreateUserDto {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
}

/**
 * DTO pour login
 */
export interface LoginDto {
    email: string;
    password: string;
}

/**
 * Réponse d'authentification
 */
export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        role: UserRole;
        companyId: string;
        companyName: string;
    };
}

/**
 * Payload du JWT
 */
export interface JwtPayload {
    userId: string;
    companyId: string;
    customerRef: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

/**
 * Factory pour créer une Company
 */
export function createCompany(dto: Omit<CreateCompanyDto, 'adminEmail' | 'adminPassword' | 'adminFirstName' | 'adminLastName'>): Company {
    const now = new Date();
    return {
        id: uuidv4(),
        customerRef: `CUST-${uuidv4().substring(0, 8).toUpperCase()}`,
        name: dto.name,
        siren: dto.siren,
        address: dto.address,
        createdAt: now,
        updatedAt: now
    };
}

/**
 * Factory pour créer un CompanyUser
 */
export function createCompanyUser(
    companyId: string,
    email: string,
    passwordHash: string,
    role: UserRole,
    firstName?: string,
    lastName?: string
): CompanyUser {
    return {
        id: uuidv4(),
        companyId,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        createdAt: new Date()
    };
}
