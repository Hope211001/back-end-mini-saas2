import express from 'express';
import LeadController from '../controllers/leads.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Récupérer la liste
router.get('/my', authenticateToken,authorizeRoles('client','admin'), LeadController.getMyLeads);

// Récupérer un seul lead (Détail)
// URL Finale sera : /api/leads/my/:id
router.get('/my/:id', authenticateToken,authorizeRoles('admin', 'client'), LeadController.showMyLead);

export default router;