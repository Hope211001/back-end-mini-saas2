// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';

class AuthController {
  static async register(req, res) {
    try {
      console.log('📝 Tentative d\'inscription:', req.body.email);

      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      // Vérifier si l'utilisateur existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        console.log('⚠️ Email déjà utilisé:', email);
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      // Hasher le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10);

      // Créer l'utilisateur
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
            name: name || null,
          }
        ])
        .select('id, email, name, created_at')
        .single();

      if (error) {
        console.error('❌ Erreur Supabase:', error);
        return res.status(500).json({
          error: 'Erreur lors de la création de l\'utilisateur',
          details: error.message
        });
      }

      // Créer le token JWT
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ Utilisateur créé:', newUser.email);

      res.status(201).json({
        token,
        user: newUser,
      });
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      res.status(500).json({
        error: 'Erreur lors de l\'inscription',
        details: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      console.log('🔐 Tentative de connexion:', req.body.email);

      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        console.log('⚠️ Utilisateur non trouvé:', email);
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        console.log('⚠️ Mot de passe incorrect pour:', email);
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;

      console.log('✅ Connexion réussie:', email);

      res.json({
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      res.status(500).json({
        error: 'Erreur lors de la connexion',
        details: error.message
      });
    }
  }

  static async getProfile(req, res) {
    try {
      // req.user.id est extrait du token par ton middleware authenticateToken
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at') // 👈 AJOUTE 'role' ICI
        .eq('id', req.user.id)
        .single();

      if (error || !user) {
        console.log('❌ Utilisateur non trouvé pour l\'ID:', req.user.id);
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // On renvoie l'utilisateur avec toutes les colonnes sélectionnées
      res.json({
        user: user
      });
    } catch (error) {
      console.error('❌ Erreur getProfile:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  }


  static async verifyToken(req, res) {
    res.json({ valid: true, user: req.user });
  }

  static async logout(req, res) {
    try {
      console.log('👋 Déconnexion utilisateur');

      // Si tu utilisais des cookies, on les supprimerait ici :
      res.clearCookie('token');

      // Pour le JWT stocké en LocalStorage, on renvoie juste un succès.
      // C'est le Frontend qui doit supprimer le token.
      res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      res.status(500).json({ error: 'Erreur lors de la déconnexion' });
    }
  }
}

export default AuthController;