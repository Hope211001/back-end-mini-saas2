// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('❌ Token invalide:', err.message);
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    req.user = decoded;
    next();
  });
};


export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Vérification de sécurité de base
    if (!req.user) {
      return res.status(401).json({ error: "Utilisateur non authentifié (token manquant ou invalide)" });
    }

    // 2. Vérification que le rôle existe bien dans le token décodé
    if (!req.user.role) {
      return res.status(403).json({ error: "Accès refusé : rôle utilisateur non défini dans le jeton" });
    }

    // 3. Vérification de l'autorisation (Logique "OU")
    // Si req.user.role est présent dans le tableau allowedRoles, on autorise.
    const isAuthorized = allowedRoles.includes(req.user.role);

    if (!isAuthorized) {
      console.warn(`[Security Warning] Tentative d'accès refusée pour le rôle: ${req.user.role}`);
      return res.status(403).json({ 
        error: `Accès refusé : vous n'avez pas les permissions nécessaires. Rôles autorisés : ${allowedRoles.join(', ')}` 
      });
    }

    // 4. Succès : on passe au contrôleur suivant
    next();
  };
};