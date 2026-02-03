// src/routes/auth.routes.js
import express from 'express';
import AuthController from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * ROUTES PUBLIQUES
 */
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout); 

/**
 * ROUTES PROTÉGÉES (Nécessitent un Token JWT valide)
 */

// Récupérer les infos de l'utilisateur connecté
router.get('/profile', authenticateToken, AuthController.getProfile);

// Vérifier si le token est toujours valide (utilisé souvent au rafraîchissement de la page Front)
router.get('/verify', authenticateToken, AuthController.verifyToken);

// Mettre à jour les informations du profil (nom, email, mot de passe)
router.put('/update-profile', authenticateToken, AuthController.updateProfile);

export default router;