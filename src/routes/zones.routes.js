import express from 'express';
import ZoneController from '../controllers/zones.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/map-status', ZoneController.getMapStatus);
router.get('/check/:cp', ZoneController.checkZoneExclusivity);

//compte
// Autorise 'client' ET 'admin'
router.get('/countAllZone', authenticateToken, authorizeRoles('client', 'admin'), ZoneController.countAllZone);
router.get('/countZoneLibre', authenticateToken, authorizeRoles('client', 'admin'), ZoneController.countZoneLibre);
router.get('/countZoneVendu', authenticateToken, authorizeRoles('client', 'admin'), ZoneController.countZoneVendu);

// Routes accessibles par Admin ET Client
router.get('/', authenticateToken, ZoneController.getAll);

// Routes réservées aux CLIENTS
router.get('/my/owned', authenticateToken, authorizeRoles('client'), ZoneController.getMyOwnedZones);

// Routes réservées aux ADMINS uniquement
router.post('/', authenticateToken, authorizeRoles('admin'), ZoneController.create);
router.put('/:id', authenticateToken, authorizeRoles('admin'), ZoneController.update);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), ZoneController.delete);

export default router;