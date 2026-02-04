// src/routes/root.routes.js
import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API de gestion de zones',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        updateProfile: 'PUT /api/auth/update-profile', // Ajouté
        verify: 'GET /api/auth/verify',
      },
      health: 'GET /health',
    },
  });
});

// Route de santé pour les déploiements (Render, Railway, etc.)
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});


router.get('/', (req, res) => {
  res.json({ status: 'API is running', version: '1.0.0' });
});

export default router;