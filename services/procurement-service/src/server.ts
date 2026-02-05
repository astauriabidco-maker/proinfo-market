/**
 * Server Entry Point
 * Point d'entrée du serveur Procurement Service
 */

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;

async function main(): Promise<void> {
    const prisma = new PrismaClient();

    try {
        // Vérifier la connexion DB
        await prisma.$connect();
        console.log('[DB] Connected to PostgreSQL');

        // Afficher la configuration
        console.log(`[CONFIG] ASSET_SERVICE_URL: ${process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000'}`);

        // Créer et démarrer l'application
        const app = createApp(prisma);

        app.listen(PORT, () => {
            console.log(`[SERVER] Procurement Service running on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('[SERVER] Shutting down...');
            await prisma.$disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('[SERVER] Shutting down...');
            await prisma.$disconnect();
            process.exit(0);
        });
    } catch (error) {
        console.error('[ERROR] Failed to start server:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

main();
