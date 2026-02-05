/**
 * Server Entry Point
 * Point d'entrée du serveur Reporting RSE
 */

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';

const PORT = process.env.PORT ?? 3009;

async function main(): Promise<void> {
    const prisma = new PrismaClient();

    try {
        await prisma.$connect();
        console.log('[DB] Connected to PostgreSQL');
        console.log(`[CONFIG] ASSET_SERVICE_URL: ${process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000'}`);
        console.log(`[CONFIG] ECOMMERCE_SERVICE_URL: ${process.env.ECOMMERCE_SERVICE_URL ?? 'http://localhost:3006'}`);
        console.log(`[CONFIG] QUALITY_SERVICE_URL: ${process.env.QUALITY_SERVICE_URL ?? 'http://localhost:3002'}`);

        const app = createApp(prisma);

        app.listen(PORT, () => {
            console.log(`[SERVER] Reporting RSE Service running on port ${PORT}`);
        });

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
