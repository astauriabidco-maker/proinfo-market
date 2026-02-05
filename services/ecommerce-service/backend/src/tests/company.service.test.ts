/**
 * Company Service Tests
 * Sprint 12 - Tests obligatoires
 */

import { CompanyService } from '../services/company-b2b.service';
import { CompanyRepository } from '../repositories/company.repository';
import { UserRepository } from '../repositories/user.repository';
import { UserRole } from '../domain/user.types';
import {
    CustomerRefExistsError,
    EmailExistsError,
    AccessDeniedError,
    CompanyNotFoundError
} from '../services/company-b2b.service';

// ============================================
// Mocks
// ============================================

const mockCompanyRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByCustomerRef: jest.fn(),
    findAll: jest.fn(),
    existsByCustomerRef: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
} as unknown as jest.Mocked<CompanyRepository>;

const mockUserRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByKeycloakId: jest.fn(),
    findByEmailWithCompany: jest.fn(),
    findByKeycloakIdWithCompany: jest.fn(),
    findByCompanyId: jest.fn(),
    existsByEmail: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    linkKeycloak: jest.fn()
} as unknown as jest.Mocked<UserRepository>;

// ============================================
// Test Data
// ============================================

const mockCompany = {
    id: 'company-uuid-1',
    name: 'ACME Corp',
    customerRef: 'ACME-001',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
};

const mockUser = {
    id: 'user-uuid-1',
    email: 'admin@acme.com',
    keycloakId: 'kc-uuid-1',
    role: UserRole.ADMIN_CLIENT,
    companyId: 'company-uuid-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
};

const mockUserWithCompany = {
    ...mockUser,
    company: {
        id: mockCompany.id,
        name: mockCompany.name,
        customerRef: mockCompany.customerRef
    }
};

// ============================================
// Tests
// ============================================

describe('CompanyService', () => {
    let service: CompanyService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CompanyService(mockCompanyRepo, mockUserRepo);
    });

    // ----------------------------------------
    // Test 1: should_create_company_with_unique_customer_ref
    // ----------------------------------------
    describe('should_create_company_with_unique_customer_ref', () => {
        it('creates a company when customerRef is unique', async () => {
            mockCompanyRepo.existsByCustomerRef.mockResolvedValue(false);
            mockCompanyRepo.create.mockResolvedValue(mockCompany);

            const result = await service.createCompany({
                name: 'ACME Corp',
                customerRef: 'ACME-001'
            });

            expect(result.name).toBe('ACME Corp');
            expect(result.customerRef).toBe('ACME-001');
            expect(mockCompanyRepo.create).toHaveBeenCalledWith({
                name: 'ACME Corp',
                customerRef: 'ACME-001'
            });
        });

        it('throws error when customerRef already exists', async () => {
            mockCompanyRepo.existsByCustomerRef.mockResolvedValue(true);

            await expect(
                service.createCompany({
                    name: 'ACME Corp',
                    customerRef: 'ACME-001'
                })
            ).rejects.toThrow(CustomerRefExistsError);

            expect(mockCompanyRepo.create).not.toHaveBeenCalled();
        });
    });

    // ----------------------------------------
    // Test 2: should_add_user_to_company
    // ----------------------------------------
    describe('should_add_user_to_company', () => {
        it('adds a user when admin requests and email is unique', async () => {
            mockCompanyRepo.findById.mockResolvedValue(mockCompany);
            mockUserRepo.existsByEmail.mockResolvedValue(false);
            mockUserRepo.create.mockResolvedValue({
                ...mockUser,
                email: 'buyer@acme.com',
                role: UserRole.ACHETEUR
            });

            const result = await service.addUser(
                'company-uuid-1',
                { email: 'buyer@acme.com', role: UserRole.ACHETEUR },
                UserRole.ADMIN_CLIENT
            );

            expect(result.email).toBe('buyer@acme.com');
            expect(result.role).toBe(UserRole.ACHETEUR);
        });

        it('throws error when email already exists', async () => {
            mockCompanyRepo.findById.mockResolvedValue(mockCompany);
            mockUserRepo.existsByEmail.mockResolvedValue(true);

            await expect(
                service.addUser(
                    'company-uuid-1',
                    { email: 'existing@acme.com', role: UserRole.ACHETEUR },
                    UserRole.ADMIN_CLIENT
                )
            ).rejects.toThrow(EmailExistsError);
        });

        it('throws error when company does not exist', async () => {
            mockCompanyRepo.findById.mockResolvedValue(null);

            await expect(
                service.addUser(
                    'nonexistent-company',
                    { email: 'buyer@acme.com', role: UserRole.ACHETEUR },
                    UserRole.ADMIN_CLIENT
                )
            ).rejects.toThrow(CompanyNotFoundError);
        });
    });

    // ----------------------------------------
    // Test 3: should_not_allow_user_from_other_company_access
    // ----------------------------------------
    describe('should_not_allow_user_from_other_company_access', () => {
        it('throws error when user tries to manage users in another company', async () => {
            mockUserRepo.findById.mockResolvedValue({
                ...mockUser,
                companyId: 'other-company-uuid' // Different company
            });

            await expect(
                service.removeUser(
                    'user-uuid-1',
                    'company-uuid-1', // Requesting user's company
                    UserRole.ADMIN_CLIENT
                )
            ).rejects.toThrow(AccessDeniedError);
        });

        it('allows removing user from same company', async () => {
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockUserRepo.delete.mockResolvedValue();

            await expect(
                service.removeUser(
                    'user-uuid-1',
                    'company-uuid-1',
                    UserRole.ADMIN_CLIENT
                )
            ).resolves.not.toThrow();

            expect(mockUserRepo.delete).toHaveBeenCalledWith('user-uuid-1');
        });
    });

    // ----------------------------------------
    // Test 4: should_restrict_actions_based_on_role
    // ----------------------------------------
    describe('should_restrict_actions_based_on_role', () => {
        it('prevents ACHETEUR from adding users', async () => {
            await expect(
                service.addUser(
                    'company-uuid-1',
                    { email: 'new@acme.com', role: UserRole.LECTURE },
                    UserRole.ACHETEUR // Not ADMIN_CLIENT
                )
            ).rejects.toThrow(AccessDeniedError);
        });

        it('prevents LECTURE from adding users', async () => {
            await expect(
                service.addUser(
                    'company-uuid-1',
                    { email: 'new@acme.com', role: UserRole.LECTURE },
                    UserRole.LECTURE // Not ADMIN_CLIENT
                )
            ).rejects.toThrow(AccessDeniedError);
        });

        it('prevents ACHETEUR from removing users', async () => {
            await expect(
                service.removeUser(
                    'user-uuid-1',
                    'company-uuid-1',
                    UserRole.ACHETEUR // Not ADMIN_CLIENT
                )
            ).rejects.toThrow(AccessDeniedError);
        });

        it('allows ADMIN_CLIENT to manage users', async () => {
            mockCompanyRepo.findById.mockResolvedValue(mockCompany);
            mockUserRepo.existsByEmail.mockResolvedValue(false);
            mockUserRepo.create.mockResolvedValue({
                ...mockUser,
                email: 'new@acme.com',
                role: UserRole.LECTURE
            });

            await expect(
                service.addUser(
                    'company-uuid-1',
                    { email: 'new@acme.com', role: UserRole.LECTURE },
                    UserRole.ADMIN_CLIENT
                )
            ).resolves.not.toThrow();
        });
    });

    // ----------------------------------------
    // GET /me tests
    // ----------------------------------------
    describe('getMe', () => {
        it('returns user profile with company', async () => {
            mockUserRepo.findByEmailWithCompany.mockResolvedValue(mockUserWithCompany);

            const result = await service.getMe('admin@acme.com');

            expect(result.email).toBe('admin@acme.com');
            expect(result.role).toBe(UserRole.ADMIN_CLIENT);
            expect(result.company.name).toBe('ACME Corp');
            expect(result.company.customerRef).toBe('ACME-001');
        });
    });
});
