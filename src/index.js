import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// Import du controller Webhook DIRECTEMENT ici
import WebhookController from './controllers/webhook.controller.js'; 

import authRoutes from './routes/auth.routes.js';
import rootRoutes from './routes/root.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import zoneRoutes from './routes/zones.routes.js';
import leadRoutes from './routes/leads.routes.js'; 
import configRoutes from './routes/config.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// app.use(cors({
//   origin: true, 
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
// }));


// 1. CONFIGURATION CORS (Doit être AVANT les routes)
app.use(cors({
  // Autorise ton frontend spécifique + localhost pour le dev
  origin: function (origin, callback) {
    // Autorise toutes les requêtes sans origine (comme les outils de test ou mobile)
    // ou les requêtes venant de ton domaine vercel
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
// 1. ROUTE WEBHOOK (IMPÉRATIVEMENT ICI)
// ==========================================
// On définit la route ici directement pour être sûr qu'aucun autre parser (json) ne la touche avant.
app.post(
  '/api/payments/webhook', 
  express.raw({ type: 'application/json' }), 
  WebhookController.handleWebhook
);

// ==========================================
// 2. MIDDLEWARES GLOBAUX
// ==========================================
// Maintenant on active le JSON pour toutes les AUTRES routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// 3. ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes); // Le webhook n'est plus dedans
app.use('/api/zones', zoneRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api', rootRoutes); 
app.use('/api/config', configRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});


