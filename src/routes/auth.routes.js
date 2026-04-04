import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes Publiques
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google-auth', AuthController.googleAuth); // Vérifie bien que c'est googleAuth ici
router.get('/verify-email', AuthController.verifyEmail);

// Routes Protégées
router.post('/logout', AuthController.logout); // Utilise la méthode logout ajoutée ci-dessus
router.get('/profile', authenticateToken, AuthController.getProfile);
router.get('/verify', authenticateToken, AuthController.verifyToken); // Utilise la méthode verifyToken
router.put('/update-profile', authenticateToken, AuthController.updateProfile);
router.put('/change-password', authenticateToken, AuthController.changePassword);

export default router;