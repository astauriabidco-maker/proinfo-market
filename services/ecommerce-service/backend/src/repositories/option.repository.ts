/**
 * Option Repository
 * Sprint 14 - Prisma-based option persistence
 * 
 * RÈGLE CRITIQUE : Le prix est FIGÉ au moment de l'ajout à la commande
 */

import { Prisma, PrismaClient, Option, OrderOption } from '@prisma/client';
import { OptionEntity, OrderOptionEntity } from '../domain/option.types';
import { Decimal } from '@prisma/client/runtime/library';

export class OptionRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Find all active options (catalog)
     */
    async findAllActive(): Promise<OptionEntity[]> {
        const options = await this.prisma.option.findMany({
            where: { active: true },
            orderBy: { name: 'asc' }
        });

        return options.map(this.toOptionEntity);
    }

    /**
     * Find option by ID
     */
    async findById(id: string): Promise<OptionEntity | null> {
        const option = await this.prisma.option.findUnique({
            where: { id }
        });

        return option ? this.toOptionEntity(option) : null;
    }

    /**
     * Find multiple options by IDs
     */
    async findByIds(ids: string[]): Promise<OptionEntity[]> {
        const options = await this.prisma.option.findMany({
            where: { id: { in: ids } }
        });

        return options.map(this.toOptionEntity);
    }

    /**
     * Add option to order with FROZEN price
     */
    async addOptionToOrder(
        orderId: string,
        optionId: string,
        frozenPrice: Decimal
    ): Promise<OrderOptionEntity> {
        const orderOption = await this.prisma.orderOption.create({
            data: {
                orderId,
                optionId,
                price: frozenPrice
            },
            include: {
                option: true
            }
        });

        return this.toOrderOptionEntity(orderOption);
    }

    /**
     * Get all options for an order
     */
    async getOrderOptions(orderId: string): Promise<OrderOptionEntity[]> {
        const orderOptions = await this.prisma.orderOption.findMany({
            where: { orderId },
            include: { option: true },
            orderBy: { createdAt: 'asc' }
        });

        return orderOptions.map(this.toOrderOptionEntity);
    }

    /**
     * Check if option already added to order
     */
    async isOptionOnOrder(orderId: string, optionId: string): Promise<boolean> {
        const existing = await this.prisma.orderOption.findFirst({
            where: { orderId, optionId }
        });
        return existing !== null;
    }

    /**
     * Seed catalog options (for initialization)
     */
    async seedCatalog(): Promise<void> {
        const existingCount = await this.prisma.option.count();
        if (existingCount > 0) return;

        await this.prisma.option.createMany({
            data: [
                // Warranties
                {
                    name: 'Extension garantie 3 ans',
                    category: 'WARRANTY',
                    description: 'Extension de la garantie pièces et main d\'œuvre à 3 ans',
                    price: new Decimal(199),
                    active: true
                },
                {
                    name: 'Extension garantie 5 ans',
                    category: 'WARRANTY',
                    description: 'Extension de la garantie pièces et main d\'œuvre à 5 ans',
                    price: new Decimal(349),
                    active: true
                },
                // Services
                {
                    name: 'Batterie neuve',
                    category: 'SERVICE',
                    description: 'Remplacement de la batterie par une batterie neuve d\'origine',
                    price: new Decimal(89),
                    active: true
                },
                {
                    name: 'Pré-installation logicielle',
                    category: 'SERVICE',
                    description: 'Configuration système selon vos spécifications (OS, drivers, applications)',
                    price: new Decimal(49),
                    active: true
                },
                {
                    name: 'Étiquetage personnalisé',
                    category: 'SERVICE',
                    description: 'Étiquettes d\'inventaire avec votre référencement interne',
                    price: new Decimal(15),
                    active: true
                },
                {
                    name: 'Tag RFID inventaire',
                    category: 'SERVICE',
                    description: 'Tag RFID pour suivi d\'inventaire automatisé',
                    price: new Decimal(25),
                    active: true
                }
            ]
        });
    }

    /**
     * Convert Prisma Option to entity
     */
    private toOptionEntity(option: Option): OptionEntity {
        return {
            id: option.id,
            name: option.name,
            category: option.category,
            description: option.description,
            price: option.price,
            active: option.active,
            createdAt: option.createdAt
        };
    }

    /**
     * Convert Prisma OrderOption to entity
     */
    private toOrderOptionEntity(
        orderOption: OrderOption & { option?: Option }
    ): OrderOptionEntity {
        return {
            id: orderOption.id,
            orderId: orderOption.orderId,
            optionId: orderOption.optionId,
            price: orderOption.price,
            createdAt: orderOption.createdAt,
            option: orderOption.option ? this.toOptionEntity(orderOption.option) : undefined
        };
    }
}
