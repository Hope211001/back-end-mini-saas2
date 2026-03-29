import express from 'express';
import InvoicesController from '../controllers/invoices.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Liste des mois avec totaux
router.get('/', authenticateToken, authorizeRoles('admin', 'client'), InvoicesController.getMonthly);

// Détail journalier d'un mois
router.get('/:month', authenticateToken, authorizeRoles('admin', 'client'), InvoicesController.getMonthDetail);

export default router;
