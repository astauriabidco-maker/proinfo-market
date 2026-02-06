/**
 * Integration Service Server
 */

import app from './app';

const PORT = process.env.PORT || 3013;

app.listen(PORT, () => {
    console.log(`[INTEGRATION] Integration Service running on port ${PORT}`);
    console.log(`[INTEGRATION] API v1: http://localhost:${PORT}/api/v1`);
    console.log(`[INTEGRATION] Health: http://localhost:${PORT}/health`);
});
