// src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../config/database.js';

class AuthController {
  static async register(req, res) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // On définit le rôle par défaut ici : 'client'
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
            name: name || null,
            role: 'client' // 👈 Rôle par défaut
          }
        ])
        .select('id, email, name, role, created_at')
        .single();

      if (error) throw error;

      // Inclusion du ROLE dans le token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({ token, user: newUser });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'inscription', details: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // 👈 CRUCIAL : On ajoute le rôle dans le JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password: _, ...userWithoutPassword } = user;
      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }

  // --- NOUVELLE MÉTHODE : UPDATE PROFILE ---
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id; // Récupéré du token
      const { name, email, currentPassword, newPassword } = req.body;

      // 1. Préparer les données de mise à jour
      let updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;

      // 2. Si l'utilisateur veut changer de mot de passe
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Ancien mot de passe requis pour le changement' });
        }

        // Vérifier l'ancien mot de passe
        const { data: user } = await supabase.from('users').select('password').eq('id', userId).single();
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
          return res.status(400).json({ error: 'Ancien mot de passe incorrect' });
        }
        
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      // 3. Update dans Supabase
      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select('id, email, name, role, created_at')
        .single();

      if (error) throw error;

      res.json({
        message: 'Profil mis à jour avec succès',
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ Update Profile Error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
  }

  static async getProfile(req, res) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('id', req.user.id)
        .single();

      if (error || !user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Erreur profile' });
    }
  }

  static async logout(req, res) {
    res.status(200).json({ message: 'Déconnexion réussie' });
  }

  static async verifyToken(req, res) {
    res.json({ valid: true, user: req.user });
  }
}

export default AuthController;