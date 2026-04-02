import express from 'express';
import CookiesController from '../controllers/cookies.controller.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/my', authenticateToken, authorizeRoles('client'), CookiesController.getMyCookie);
router.put('/my', authenticateToken, authorizeRoles('client'), CookiesController.upsertCookie);
router.delete('/my', authenticateToken, authorizeRoles('client'), CookiesController.deleteCookie);

export default router;
