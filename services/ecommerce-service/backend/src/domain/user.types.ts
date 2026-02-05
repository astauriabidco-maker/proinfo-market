/**
 * Domain Types: User
 * Sprint 12 - Comptes Clients B2B
 */

import { CompanyResponse } from './company.types';

/**
 * Rôles utilisateur B2B
 */
export enum UserRole {
    ADMIN_CLIENT = 'ADMIN_CLIENT',  // Gestion utilisateurs
    ACHETEUR = 'ACHETEUR',          // Devis + commandes
    LECTURE = 'LECTURE'             // Consultation seule
}

/**
 * Utilisateur B2B
 */
export interface User {
    id: string;
    email: string;
    keycloakId: string | null;
    role: UserRole;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Utilisateur avec sa Company
 */
export interface UserWithCompany extends User {
    company: {
        id: string;
        name: string;
        customerRef: string;
    };
}

/**
 * DTO pour ajout utilisateur
 */
export interface CreateUserDto {
    email: string;
    role: UserRole;
}

/**
 * DTO pour mise à jour utilisateur
 */
export interface UpdateUserDto {
    role?: UserRole;
}

/**
 * Réponse API utilisateur
 */
export interface UserResponse {
    id: string;
    email: string;
    role: UserRole;
    companyId: string;
    createdAt: string;
}

/**
 * Réponse GET /me
 */
export interface MeResponse {
    email: string;
    role: UserRole;
    company: CompanyResponse;
}

/**
 * Context utilisateur authentifié (via Keycloak)
 */
export interface AuthContext {
    userId: string;
    email: string;
    keycloakId: string;
    role: UserRole;
    companyId: string;
    customerRef: string;
}

/**
 * Convertit un User en réponse API
 */
export function toUserResponse(user: User): UserResponse {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt.toISOString()
    };
}

/**
 * Vérifie si un rôle est valide
 */
export function isValidRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Vérifie si l'utilisateur peut créer des devis/commandes
 */
export function canOrder(role: UserRole): boolean {
    return role === UserRole.ADMIN_CLIENT || role === UserRole.ACHETEUR;
}

/**
 * Vérifie si l'utilisateur peut gérer les autres utilisateurs
 */
export function canManageUsers(role: UserRole): boolean {
    return role === UserRole.ADMIN_CLIENT;
}
