/**
 * Subscription Service Server
 */

import app from './app';

const PORT = process.env.PORT || 3014;

app.listen(PORT, () => {
    console.log(`[SUBSCRIPTION] Subscription Service running on port ${PORT}`);
    console.log(`[SUBSCRIPTION] Health: http://localhost:${PORT}/health`);
});
