/**
 * Asset Dossier Service — Server Entry Point
 */

import { createApp } from './app';

const PORT = process.env.PORT || 3011;

const app = createApp();

app.listen(PORT, () => {
    console.log(`[DOSSIER] Asset Dossier Service running on port ${PORT}`);
    console.log(`[DOSSIER] Health check: http://localhost:${PORT}/health`);
});
