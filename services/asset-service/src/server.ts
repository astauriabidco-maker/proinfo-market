/**
 * Server Entry Point
 * Point d'entrée du serveur Asset Service
 */

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT ?? 3000;

// Configure logger service name
logger.setServiceName('asset-service');

async function main(): Promise<void> {
    const prisma = new PrismaClient();

    try {
        // Vérifier la connexion DB
        await prisma.$connect();
        logger.dbConnected();

        // Créer et démarrer l'application
        const app = createApp(prisma);

        app.listen(PORT, () => {
            logger.serverStart(Number(PORT));
        });

        // Graceful shutdown
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
