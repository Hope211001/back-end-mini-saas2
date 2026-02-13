import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http'; // <--- AJOUT
import { Server } from 'socket.io'; // <--- AJOUT

import WebhookController from './controllers/webhook.controller.js'; 
import authRoutes from './routes/auth.routes.js';
import rootRoutes from './routes/root.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import zoneRoutes from './routes/zones.routes.js';
import leadRoutes from './routes/leads.routes.js'; 
import configRoutes from './routes/config.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js'; // <--- AJOUT ROUTE

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CONFIGURATION SOCKET.IO
// ==========================================
const server = http.createServer(app); // On enveloppe l'app Express
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://dark-mode-master.vercel.app"], // AJOUTE TES URLS FRONT
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});

// Rendre 'io' accessible partout via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`🔌 Client connecté Socket: ${socket.id}`);
  
  // Optionnel: Rejoindre une "room" spécifique à l'utilisateur pour des notifs privées
  socket.on('join_user_room', (userId) => {
     socket.join(`user_${userId}`);
     console.log(`👤 User ${userId} a rejoint sa room privée`);
  });

  socket.on('disconnect', () => {
    console.log('Client déconnecté');
  });
});

// ==========================================
// MIDDLEWARES
// ==========================================
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

// Route Webhook
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), WebhookController.handleWebhook);

// Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/config', configRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes); // <--- AJOUT
app.use('/api', rootRoutes); 

// ==========================================
// DÉMARRAGE (Utiliser server.listen et pas app.listen)
// ==========================================
server.listen(PORT, () => {
  console.log(`🚀 Serveur + Socket.io démarré sur http://localhost:${PORT}`);
});