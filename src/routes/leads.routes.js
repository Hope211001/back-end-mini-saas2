import express from 'express';
import LeadController from '../controllers/leads.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

//pour super admin
router.get('/', authenticateToken,authorizeRoles('admin'), LeadController.getAll);
// Récupérer la liste
router.get('/my', authenticateToken,authorizeRoles('admin','client'), LeadController.getMyLeads);
// Récupérer un seul lead (Détail)
router.get('/my/:id', authenticateToken,authorizeRoles('admin','client'), LeadController.showMyLead);


export default router;