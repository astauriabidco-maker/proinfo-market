/**
 * Server Entry Point
 * Point d'entrée du serveur CTO Engine
 */

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT ?? 3005;

logger.setServiceName('cto-service');

async function main(): Promise<void> {
    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        logger.dbConnected();
        logger.info('CONFIG', 'Service configuration loaded', {
            INVENTORY_SERVICE_URL: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003',
            ASSET_SERVICE_URL: process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000'
        });

        const app = createApp(prisma);

        app.listen(PORT, () => {
            logger.serverStart(Number(PORT));
        });

        process.on('SIGINT', async () => {
            logger.serverShutdown();
            await prisma.$disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.serverShutdown();
            await prisma.$disconnect();
            process.exit(0);
        });
    } catch (error) {
        logger.error('STARTUP', 'Failed to start server', { error: String(error) });
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
