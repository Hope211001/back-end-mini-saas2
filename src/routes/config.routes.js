// src/routes/config.routes.js
import express from 'express';
import ConfigController from '../controllers/config.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Toutes les routes de config nécessitent d'être connecté
router.get('/me', authenticateToken,authorizeRoles('client','admin'), ConfigController.getConfig);
router.put('/update', authenticateToken,authorizeRoles('client','admin'), ConfigController.updateConfig);

export default router;