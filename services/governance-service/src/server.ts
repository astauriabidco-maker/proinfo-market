/**
 * Governance Service Server
 */

import app from './app';

const PORT = process.env.PORT || 3015;

app.listen(PORT, () => {
    console.log(`[GOVERNANCE] Governance Service running on port ${PORT}`);
    console.log(`[GOVERNANCE] Health: http://localhost:${PORT}/health`);
});
