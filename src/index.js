import 'dotenv/config';
import express from 'express';
import cors from 'cors'; // On reprend la librairie officielle
import authRoutes from './routes/auth.routes.js';
import rootRoutes from './routes/root.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import zoneRoutes from './routes/zones.routes.js';
import leadRoutes from './routes/leads.routes.js'; 

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CONFIGURATION CORS STANDARD & SIMPLE
// ==========================================
app.use(cors({
  // "true" signifie : autorise automatiquement l'origine qui fait la demande
  // (Que ce soit localhost:5173 ou 127.0.0.1:5173)
  origin: true, 
  
  // Autorise les cookies et headers d'authentification
  credentials: true,
  
  // Méthodes autorisées
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  
  // Headers autorisés
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// ⚠️ IMPORTANT : Le Webhook DOIT être placé AVANT app.use(express.json())
// ou alors tu utilises express.raw() uniquement pour cette route.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));


// Middleware de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging pour débugger
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.originalUrl}`);
  next();
});

// 1. D'ABORD les routes spécifiques
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/leads', leadRoutes);

// 2. ENSUITE la route racine /api (rootRoutes)
app.use('/api', rootRoutes); 

// Test
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion Erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur Serveur:', err);
  res.status(500).json({ error: 'Erreur interne', details: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`✅ CORS activé en mode automatique (origin: true)`);
});