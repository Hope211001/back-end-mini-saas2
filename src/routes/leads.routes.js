import express from 'express';
import LeadController from '../controllers/leads.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Récupérer la liste
router.get('/my', authenticateToken, LeadController.getMyLeads);

// Récupérer un seul lead (Détail)
// URL Finale sera : /api/leads/my/:id
router.get('/my/:id', authenticateToken, LeadController.showMyLead);

export default router;