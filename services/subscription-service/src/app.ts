/**
 * Subscription Service Application
 */

import express from 'express';
import contractRoutes from './routes/contract.routes';
import renewalRoutes from './routes/renewal.routes';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'subscription-service' });
});

// Routes
app.use('/contracts', contractRoutes);
app.use('/renewals', renewalRoutes);

export default app;
