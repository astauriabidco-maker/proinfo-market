/**
 * RSE Service Application
 * Express app configuration
 */

import express from 'express';
import rseRoutes from './routes/rse.routes';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'rse-service' });
});

// RSE routes
app.use('/rse', rseRoutes);

export default app;
