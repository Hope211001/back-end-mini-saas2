import express from 'express';
import LeadController from '../controllers/leads.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

//pour super admin
router.get('/', authenticateToken,authorizeRoles('admin'), LeadController.getAll);
router.get('/villes', authenticateToken,authorizeRoles('admin'), LeadController.getDistinctVilles);
// Récupérer la liste
router.get('/my', authenticateToken,authorizeRoles('admin','client'), LeadController.getMyLeads);
// Export CSV avec les mêmes filtres
router.get('/my/export-csv', authenticateToken,authorizeRoles('admin','client'), LeadController.exportCSV);
// Récupérer un seul lead (Détail)
router.get('/my/:id', authenticateToken,authorizeRoles('admin','client'), LeadController.showMyLead);
// Contacter un lead (webhook n8n)
router.post('/my/:id/contact', authenticateToken,authorizeRoles('admin','client'), LeadController.contactLead);
// Mettre à jour le statut d'un lead
router.patch('/my/:id/status', authenticateToken,authorizeRoles('admin','client'), LeadController.updateStatus);


export default router;