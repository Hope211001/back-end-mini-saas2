import express from 'express';
import UserController from '../controllers/user.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// 1. Route de lecture (Liste)
router.get('/', authenticateToken, authorizeRoles('admin'), UserController.getAll);

// 2. Routes spécifiques (DOIVENT ÊTRE EN PREMIER)
// On utilise PUT car on met à jour le statut
router.put('/delete/:id', authenticateToken, authorizeRoles('admin'), UserController.delete);
router.put('/blocked/:id', authenticateToken, authorizeRoles('admin'), UserController.blocked);

// 3. Routes CRUD générales (TOUJOURS EN DERNIER)
router.post('/', authenticateToken, authorizeRoles('admin'), UserController.create);
router.put('/:id', authenticateToken, authorizeRoles('admin'), UserController.update);

export default router;