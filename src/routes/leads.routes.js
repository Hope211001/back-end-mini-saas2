// src/routes/leads.routes.js
import express from 'express';
import LeadController from '../controllers/leads.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my', authenticateToken, LeadController.getMyLeads);

export default router;