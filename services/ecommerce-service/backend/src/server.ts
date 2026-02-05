/**
 * Server Entry Point
 * Point d'entrée du serveur E-commerce Backend
 */

import { createApp } from './app';

const PORT = process.env.PORT ?? 3006;

async function main(): Promise<void> {
    console.log(`[CONFIG] ASSET_SERVICE_URL: ${process.env.ASSET_SERVICE_URL ?? 'http://localhost:3000'}`);
    console.log(`[CONFIG] INVENTORY_SERVICE_URL: ${process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3003'}`);
    console.log(`[CONFIG] CTO_SERVICE_URL: ${process.env.CTO_SERVICE_URL ?? 'http://localhost:3005'}`);

    const app = createApp();

    app.listen(PORT, () => {
        console.log(`[SERVER] E-commerce Backend running on port ${PORT}`);
    });

    process.on('SIGINT', () => {
        console.log('[SERVER] Shutting down...');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('[SERVER] Shutting down...');
        process.exit(0);
    });
}

main();
