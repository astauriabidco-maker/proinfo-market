/**
 * Domain Types: Company
 * Sprint 12 - Comptes Clients B2B
 */

/**
 * Entreprise cliente B2B
 */
export interface Company {
    id: string;
    name: string;
    customerRef: string;  // Clé de liaison ERP
    createdAt: Date;
    updatedAt: Date;
}

/**
 * DTO pour création d'entreprise
 */
export interface CreateCompanyDto {
    name: string;
    customerRef: string;
}

/**
 * DTO pour mise à jour d'entreprise
 */
export interface UpdateCompanyDto {
    name?: string;
}

/**
 * Réponse API entreprise
 */
export interface CompanyResponse {
    id: string;
    name: string;
    customerRef: string;
    createdAt: string;
}

/**
 * Convertit une Company en réponse API
 */
export function toCompanyResponse(company: Company): CompanyResponse {
    return {
        id: company.id,
        name: company.name,
        customerRef: company.customerRef,
        createdAt: company.createdAt.toISOString()
    };
}
