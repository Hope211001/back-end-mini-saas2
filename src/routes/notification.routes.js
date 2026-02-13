import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Récupérer la liste et le compteur (Protégé par token)
router.get('/', authenticateToken, NotificationController.getMyNotifications);

// Marquer une notification spécifique comme lue
router.put('/:id/read', authenticateToken, NotificationController.markAsRead);

// Marquer toutes les notifications comme lues
router.put('/mark-all-read', authenticateToken, NotificationController.markAllRead);

export default router;