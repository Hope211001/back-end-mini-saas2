import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import WebhookController from './controllers/webhook.controller.js'; 
import authRoutes from './routes/auth.routes.js';
import rootRoutes from './routes/root.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import zoneRoutes from './routes/zones.routes.js';
import leadRoutes from './routes/leads.routes.js'; 
import configRoutes from './routes/config.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js'
import userRoutes from './routes/user.routes.js'

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// 1. MIDDLEWARES DE SÉCURITÉ ET GLOBAUX (DOIVENT ÊTRE EN HAUT)
// ==========================================

// HELMET DOIT ÊTRE AVANT LES ROUTES
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || origin.includes('vercel.app') || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 2. ROUTE WEBHOOK (IMPÉRATIVEMENT AVANT express.json())
// ==========================================
app.post(
  '/api/payments/webhook', 
  express.raw({ type: 'application/json' }), 
  WebhookController.handleWebhook
);

// ==========================================
// 3. PARSERS JSON (POUR TOUTES LES AUTRES ROUTES)
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger pour le debug
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 4. ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/config', configRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', rootRoutes); 

// ==========================================
// 5. DÉMARRAGE DU SERVEUR
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});