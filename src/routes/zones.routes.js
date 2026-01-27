import express from 'express';
import ZoneController from '../controllers/zones.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// 1. Route publique (ou privée) pour afficher l'état de la carte
router.get('/map-status', ZoneController.getMapStatus);

// 2. Route pour vérifier un code postal lors d'une recherche
router.get('/check/:cp', ZoneController.checkZoneExclusivity);

// Routes pour gérer les zones
router.get('/', ZoneController.getAll);
router.get('/my/owned', authenticateToken, ZoneController.getMyOwnedZones);
router.post('/', authenticateToken, ZoneController.create);
router.put('/:id', authenticateToken, ZoneController.update);
router.delete('/:id', authenticateToken, ZoneController.delete);

export default router;