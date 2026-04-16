import express from 'express';
import ContactController from '../controllers/contact.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public
router.post('/', ContactController.send);

// Admin only
router.get('/', authenticateToken, authorizeRoles('admin'), ContactController.getAll);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), ContactController.remove);

export default router;
