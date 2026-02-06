/**
 * Governance Service Application
 */

import express from 'express';
import rolesRoutes from './routes/roles.routes';
import delegationsRoutes from './routes/delegations.routes';
import decisionsRoutes from './routes/decisions.routes';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'governance-service' });
});

// Routes
app.use('/governance/roles', rolesRoutes);
app.use('/governance/delegations', delegationsRoutes);
app.use('/governance/decisions', decisionsRoutes);

export default app;
