import express from 'express';
import PaymentController from '../controllers/payment.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route pour acheter une ville
router.post('/buy-zone', authenticateToken, PaymentController.createCheckoutSession);


export default router;