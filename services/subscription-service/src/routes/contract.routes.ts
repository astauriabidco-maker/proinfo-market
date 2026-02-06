/**
 * Contract Routes
 * Endpoints pour la gestion des contrats
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ContractService } from '../services/contract.service';

const router = Router();
const prisma = new PrismaClient();
const contractService = new ContractService(prisma);

/**
 * POST /contracts
 * Créer un contrat (interne uniquement)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const contract = await contractService.createContract(req.body);
        res.status(201).json({ data: contract });
    } catch (error: any) {
        if (error.name === 'ContractValidationError') {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to create contract' });
    }
});

/**
 * GET /contracts/:id
 * Récupérer un contrat (vue interne)
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const contract = await contractService.getContractWithAssets(req.params.id);
        res.json({ data: contract });
    } catch (error: any) {
        if (error.name === 'ContractNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

/**
 * GET /contracts/company/:companyId
 * Contrats d'une entreprise (vue interne)
 */
router.get('/company/:companyId', async (req: Request, res: Response): Promise<void> => {
    try {
        const contracts = await contractService.getContractsByCompany(req.params.companyId);
        res.json({ data: contracts });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

/**
 * GET /contracts/:id/client-view
 * Vue client (lecture seule, pas d'ARR)
 */
router.get('/:id/client-view', async (req: Request, res: Response): Promise<void> => {
    try {
        const companyId = req.query.companyId as string;
        if (!companyId) {
            res.status(400).json({ error: 'companyId required' });
            return;
        }

        const view = await contractService.getClientContractView(companyId, req.params.id);
        if (!view) {
            res.status(404).json({ error: 'Contract not found' });
            return;
        }

        res.json({ data: view });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contract view' });
    }
});

/**
 * POST /contracts/:id/terminate
 * Terminer un contrat
 */
router.post('/:id/terminate', async (req: Request, res: Response): Promise<void> => {
    try {
        await contractService.terminateContract(req.params.id);
        res.json({ data: { terminated: true } });
    } catch (error: any) {
        if (error.name === 'ContractNotFoundError') {
            res.status(404).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Failed to terminate contract' });
    }
});

export default router;
