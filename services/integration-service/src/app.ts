/**
 * Integration Service Application
 */

import express from 'express';
import apiV1Routes from './routes/api.v1.routes';
import webhookRoutes from './routes/webhook.routes';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'integration-service', apiVersion: 'v1' });
});

// API v1 routes
app.use('/api/v1', apiV1Routes);

// Webhook management routes
app.use('/webhooks', webhookRoutes);

export default app;
