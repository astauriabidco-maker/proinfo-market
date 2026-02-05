/**
 * Battery Repository
 * Couche d'accès aux données pour la santé batterie
 */

import { PrismaClient, BatteryHealth } from '@prisma/client';
import { BatteryHealthEntity, RecordBatteryHealthDto } from '../domain/battery.types';

export class BatteryRepository {
    constructor(private readonly prisma: PrismaClient) { }

    /**
     * Enregistre ou met à jour la santé batterie
     * Une seule mesure active par asset (upsert)
     */
    async upsert(assetId: string, dto: RecordBatteryHealthDto): Promise<BatteryHealthEntity> {
        const battery = await this.prisma.batteryHealth.upsert({
            where: { assetId },
            create: {
                assetId,
                stateOfHealth: dto.stateOfHealth,
                cycles: dto.cycles
            },
            update: {
                stateOfHealth: dto.stateOfHealth,
                cycles: dto.cycles,
                measuredAt: new Date()
            }
        });

        return this.toEntity(battery);
    }

    /**
     * Récupère la santé batterie d'un asset
     */
    async findByAssetId(assetId: string): Promise<BatteryHealthEntity | null> {
        const battery = await this.prisma.batteryHealth.findUnique({
            where: { assetId }
        });

        return battery ? this.toEntity(battery) : null;
    }

    /**
     * Convertit un record Prisma en entité domaine
     */
    private toEntity(battery: BatteryHealth): BatteryHealthEntity {
        return {
            assetId: battery.assetId,
            stateOfHealth: battery.stateOfHealth,
            cycles: battery.cycles,
            measuredAt: battery.measuredAt
        };
    }
}
