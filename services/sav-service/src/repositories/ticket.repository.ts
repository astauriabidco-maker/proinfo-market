/**
 * Ticket Repository
 * Couche d'accès aux données pour les tickets SAV
 */

import { PrismaClient, SavTicket, TicketStatus } from '@prisma/client';
import { TicketEntity } from '../domain/ticket.types';

export class TicketRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Crée un ticket SAV
     */
    async create(
        assetId: string,
        customerRef: string,
        issue: string
    ): Promise<TicketEntity> {
        const ticket = await this.prisma.savTicket.create({
            data: {
                assetId,
                customerRef,
                issue,
                status: TicketStatus.OPEN
            }
        });
        return this.toEntity(ticket);
    }

    /**
     * Recherche un ticket par ID
     */
    async findById(id: string): Promise<TicketEntity | null> {
        const ticket = await this.prisma.savTicket.findUnique({
            where: { id }
        });
        return ticket ? this.toEntity(ticket) : null;
    }

    /**
     * Recherche les tickets par assetId
     */
    async findByAssetId(assetId: string): Promise<TicketEntity[]> {
        const tickets = await this.prisma.savTicket.findMany({
            where: { assetId },
            orderBy: { createdAt: 'desc' }
        });
        return tickets.map(t => this.toEntity(t));
    }

    /**
     * Met à jour le statut d'un ticket
     */
    async updateStatus(id: string, status: TicketStatus): Promise<TicketEntity> {
        const ticket = await this.prisma.savTicket.update({
            where: { id },
            data: { status }
        });
        return this.toEntity(ticket);
    }

    /**
     * Convertit en entité
     */
    private toEntity(ticket: SavTicket): TicketEntity {
        return {
            id: ticket.id,
            assetId: ticket.assetId,
            customerRef: ticket.customerRef,
            issue: ticket.issue,
            status: ticket.status,
            createdAt: ticket.createdAt
        };
    }
}
