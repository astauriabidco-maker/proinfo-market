/**
 * Company Service
 * Gestion des comptes entreprise B2B
 */

import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import {
    Company,
    CompanyUser,
    UserRole,
    CreateCompanyDto,
    CreateUserDto,
    LoginDto,
    AuthResponse,
    JwtPayload,
    createCompany,
    createCompanyUser
} from '../models/company.model';

const JWT_SECRET = process.env.JWT_SECRET ?? 'proinfo-market-secret-dev';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

/**
 * Erreur : Email déjà utilisé
 */
export class EmailAlreadyExistsError extends Error {
    constructor(email: string) {
        super(`Email ${email} is already registered`);
        this.name = 'EmailAlreadyExistsError';
    }
}

/**
 * Erreur : Identifiants invalides
 */
export class InvalidCredentialsError extends Error {
    constructor() {
        super('Invalid email or password');
        this.name = 'InvalidCredentialsError';
    }
}

/**
 * Erreur : Entreprise non trouvée
 */
export class CompanyNotFoundError extends Error {
    constructor(id: string) {
        super(`Company ${id} not found`);
        this.name = 'CompanyNotFoundError';
    }
}

/**
 * Erreur : Utilisateur non trouvé
 */
export class UserNotFoundError extends Error {
    constructor(id: string) {
        super(`User ${id} not found`);
        this.name = 'UserNotFoundError';
    }
}

/**
 * Erreur : Permission refusée
 */
export class PermissionDeniedError extends Error {
    constructor(action: string) {
        super(`Permission denied for action: ${action}`);
        this.name = 'PermissionDeniedError';
    }
}

export class CompanyService {
    // Stockage en mémoire (comme le MVP)
    private readonly companies: Map<string, Company> = new Map();
    private readonly users: Map<string, CompanyUser> = new Map();
    private readonly emailIndex: Map<string, string> = new Map(); // email -> userId

    /**
     * Crée une nouvelle entreprise avec son admin initial
     */
    async registerCompany(dto: CreateCompanyDto): Promise<AuthResponse> {
        // Vérifier que l'email n'existe pas déjà
        if (this.emailIndex.has(dto.adminEmail.toLowerCase())) {
            throw new EmailAlreadyExistsError(dto.adminEmail);
        }

        // Créer l'entreprise
        const company = createCompany({
            name: dto.name,
            siren: dto.siren,
            address: dto.address
        });
        this.companies.set(company.id, company);

        // Créer l'admin
        const passwordHash = await bcrypt.hash(dto.adminPassword, SALT_ROUNDS);
        const admin = createCompanyUser(
            company.id,
            dto.adminEmail,
            passwordHash,
            UserRole.ADMIN_CLIENT,
            dto.adminFirstName,
            dto.adminLastName
        );
        this.users.set(admin.id, admin);
        this.emailIndex.set(admin.email, admin.id);

        // Générer le token
        const token = this.generateToken(admin, company);

        return {
            token,
            user: {
                id: admin.id,
                email: admin.email,
                role: admin.role,
                companyId: company.id,
                companyName: company.name
            }
        };
    }

    /**
     * Connexion utilisateur
     */
    async login(dto: LoginDto): Promise<AuthResponse> {
        const email = dto.email.toLowerCase();
        const userId = this.emailIndex.get(email);

        if (!userId) {
            throw new InvalidCredentialsError();
        }

        const user = this.users.get(userId);
        if (!user) {
            throw new InvalidCredentialsError();
        }

        const isValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isValid) {
            throw new InvalidCredentialsError();
        }

        const company = this.companies.get(user.companyId);
        if (!company) {
            throw new InvalidCredentialsError();
        }

        // Mettre à jour dernière connexion
        user.lastLoginAt = new Date();

        const token = this.generateToken(user, company);

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                companyId: company.id,
                companyName: company.name
            }
        };
    }

    /**
     * Vérifie et décode un token JWT
     */
    verifyToken(token: string): JwtPayload {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    }

    /**
     * Récupère une entreprise par ID
     */
    async getCompanyById(companyId: string): Promise<Company | null> {
        return this.companies.get(companyId) ?? null;
    }

    /**
     * Récupère une entreprise par customerRef
     */
    async getCompanyByCustomerRef(customerRef: string): Promise<Company | null> {
        return Array.from(this.companies.values()).find(c => c.customerRef === customerRef) ?? null;
    }

    /**
     * Récupère un utilisateur par ID
     */
    async getUserById(userId: string): Promise<CompanyUser | null> {
        return this.users.get(userId) ?? null;
    }

    /**
     * Liste les utilisateurs d'une entreprise
     */
    async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
        return Array.from(this.users.values()).filter(u => u.companyId === companyId);
    }

    /**
     * Ajoute un utilisateur à une entreprise (ADMIN_CLIENT seulement)
     */
    async addUser(companyId: string, dto: CreateUserDto, requestingUserId: string): Promise<CompanyUser> {
        // Vérifier que le demandeur est ADMIN_CLIENT
        const requestingUser = this.users.get(requestingUserId);
        if (!requestingUser || requestingUser.role !== UserRole.ADMIN_CLIENT) {
            throw new PermissionDeniedError('addUser');
        }

        // Vérifier que le demandeur appartient à la même entreprise
        if (requestingUser.companyId !== companyId) {
            throw new PermissionDeniedError('addUser');
        }

        // Vérifier que l'email n'existe pas
        if (this.emailIndex.has(dto.email.toLowerCase())) {
            throw new EmailAlreadyExistsError(dto.email);
        }

        // Créer l'utilisateur
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const user = createCompanyUser(
            companyId,
            dto.email,
            passwordHash,
            dto.role,
            dto.firstName,
            dto.lastName
        );
        this.users.set(user.id, user);
        this.emailIndex.set(user.email, user.id);

        return user;
    }

    /**
     * Vérifie si un utilisateur peut commander
     */
    canOrder(role: UserRole): boolean {
        return role === UserRole.ADMIN_CLIENT || role === UserRole.ACHETEUR;
    }

    /**
     * Génère un token JWT
     */
    private generateToken(user: CompanyUser, company: Company): string {
        const payload: JwtPayload = {
            userId: user.id,
            companyId: company.id,
            customerRef: company.customerRef,
            role: user.role
        };
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
}
