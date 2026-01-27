import express from 'express';
import PaymentController from '../controllers/payment.controller.js';
import WebhookController from '../controllers/webhook.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Route pour acheter une ville
router.post('/buy-zone', authenticateToken, PaymentController.createCheckoutSession);


// Route Webhook (Attention : Stripe l'appelle en POST)
// Note: Cette route doit être configurée spécialement dans ton index.js
router.post('/webhook', express.raw({type: 'application/json'}),  WebhookController.handleWebhook);

export default router;