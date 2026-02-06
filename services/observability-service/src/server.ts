/**
 * Server Entry Point
 * Démarrage du service observability
 */

import { PrismaClient } from '@prisma/client';
import { createApp } from './app';

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3010;

async function main() {
    try {
        await prisma.$connect();
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'INFO',
            service: 'observability-service',
            category: 'DB',
            message: 'Connected to PostgreSQL'
        }));

        const app = createApp(prisma);

        app.listen(PORT, () => {
            console.log(JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'INFO',
                service: 'observability-service',
                category: 'SERVER',
                message: `Service started on port ${PORT}`,
                metadata: { port: Number(PORT) }
            }));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

main();
