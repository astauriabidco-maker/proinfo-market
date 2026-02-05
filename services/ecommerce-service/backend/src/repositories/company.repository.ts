/**
 * Company Repository
 * Sprint 12 - Accès données Company via Prisma
 */

import { PrismaClient, Company as PrismaCompany } from '@prisma/client';
import { Company, CreateCompanyDto, UpdateCompanyDto } from '../domain/company.types';

export class CompanyRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée une nouvelle entreprise
     */
    async create(dto: CreateCompanyDto): Promise<Company> {
        const company = await this.prisma.company.create({
            data: {
                name: dto.name,
                customerRef: dto.customerRef
            }
        });
        return this.toDomain(company);
    }

    /**
     * Trouve une entreprise par ID
     */
    async findById(id: string): Promise<Company | null> {
        const company = await this.prisma.company.findUnique({
            where: { id }
        });
        return company ? this.toDomain(company) : null;
    }

    /**
     * Trouve une entreprise par customerRef
     */
    async findByCustomerRef(customerRef: string): Promise<Company | null> {
        const company = await this.prisma.company.findUnique({
            where: { customerRef }
        });
        return company ? this.toDomain(company) : null;
    }

    /**
     * Met à jour une entreprise
     */
    async update(id: string, dto: UpdateCompanyDto): Promise<Company> {
        const company = await this.prisma.company.update({
            where: { id },
            data: dto
        });
        return this.toDomain(company);
    }

    /**
     * Supprime une entreprise (et ses utilisateurs en cascade)
     */
    async delete(id: string): Promise<void> {
        await this.prisma.company.delete({
            where: { id }
        });
    }

    /**
     * Liste toutes les entreprises
     */
    async findAll(): Promise<Company[]> {
        const companies = await this.prisma.company.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return companies.map(c => this.toDomain(c));
    }

    /**
     * Vérifie si un customerRef existe déjà
     */
    async existsByCustomerRef(customerRef: string): Promise<boolean> {
        const count = await this.prisma.company.count({
            where: { customerRef }
        });
        return count > 0;
    }

    /**
     * Convertit Prisma Company en domain Company
     */
    private toDomain(prismaCompany: PrismaCompany): Company {
        return {
            id: prismaCompany.id,
            name: prismaCompany.name,
            customerRef: prismaCompany.customerRef,
            createdAt: prismaCompany.createdAt,
            updatedAt: prismaCompany.updatedAt
        };
    }
}
