/**
 * RSE Service Server
 * Entry point
 */

import app from './app';

const PORT = process.env.PORT || 3012;

app.listen(PORT, () => {
    console.log(`[RSE] RSE Service running on port ${PORT}`);
    console.log(`[RSE] Health check: http://localhost:${PORT}/health`);
});
