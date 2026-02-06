import express from 'express';
import SubscriptionController from '../controllers/subscription.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();
router.get('/zone/:zoneId', authenticateToken,authorizeRoles('client'), SubscriptionController.getSubscriptionByZone);
router.put('/zone/:zoneId', authenticateToken, authorizeRoles('client'), SubscriptionController.updateByZone);
export default router;