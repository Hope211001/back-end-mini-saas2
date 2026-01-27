// src/routes/root.routes.js (Version ESM)
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route publique - Page d'accueil
router.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (protégé)',
        verify: 'GET /api/auth/verify (protégé)',
      },
      health: 'GET /health',
    },
  });
});

// Route protégée exemple - Dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    message: 'Bienvenue sur votre dashboard',
    user: req.user,
  });
});

export default router;