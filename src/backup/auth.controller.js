import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import supabase from '../config/database.js';

// Une seule instance suffit pour tout le contrôleur
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS?.replace(/\s+/g, ''),
  },
});



class AuthController {
  // ==========================================
  // HELPER : FONCTION D'ENVOI D'EMAIL
  // ==========================================
  static async sendVerificationEmail(email, name, token, id) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}&id=${id}`;

    console.log("------------------------------------------");
    console.log("📧 Tentative d'envoi d'email à :", email);
    console.log("🔗 Lien :", verificationUrl);

    try {
      const info = await transporter.sendMail({
        from: `"ImmoScout" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Activez votre compte ImmoScout",
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Bonjour ${name || 'utilisateur'} !</h2>
            <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
            <a href="${verificationUrl}" 
               style="display:inline-block; background:#4F46E5; color:white; padding:12px 24px; text-decoration:none; border-radius:8px; margin: 20px 0;">
              Activer mon compte
            </a>
          </div>
        `
      });
      console.log("✅ Email envoyé ! ID:", info.messageId);
      return info;
    } catch (mailError) {
      console.error("❌ ERREUR Nodemailer détaillée :", mailError.message);
      throw mailError;
    }
  }

  // --- 1. INSCRIPTION MANUELLE ---
  static async register(req, res) {
    try {
      const { email, password, name } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const { data: existingUser } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
      if (existingUser) return res.status(400).json({ error: 'Email déjà utilisé' });

      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{ email: normalizedEmail, password: hashedPassword, name, verification_token: verificationToken, is_verified: false, role: 'client' }])
        .select().single();

      if (error) throw error;

      // ✅ CHANGEMENT ICI : AuthController au lieu de this
      await AuthController.sendVerificationEmail(newUser.email, newUser.name, verificationToken, newUser.id);

      res.status(201).json({ message: 'Email de vérification envoyé' });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  }

  // --- 2. GOOGLE AUTH ---
  static async googleAuth(req, res) {
    try {
      const { credential } = req.body;
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const { email, name, sub: google_id } = ticket.getPayload();
      const normalizedEmail = email.toLowerCase().trim();

      let { data: user } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();

      if (!user) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const { data: newUser, error: insError } = await supabase
          .from('users')
          .insert([{ email: normalizedEmail, name, google_id, is_verified: false, verification_token: verificationToken, role: 'client' }])
          .select().single();

        if (insError) throw insError;
        user = newUser;

        // ✅ CHANGEMENT ICI : AuthController au lieu de this
        await AuthController.sendVerificationEmail(user.email, user.name, verificationToken, user.id);

        return res.status(201).json({
          message: 'Compte créé avec Google. Veuillez vérifier votre email.',
          requiresVerification: true
        });

      } else if (user.is_verified === false) {
        console.log("🔄 Renvoi du mail pour utilisateur existant non vérifié");
        const newToken = crypto.randomBytes(32).toString('hex');
        await supabase.from('users').update({ verification_token: newToken }).eq('id', user.id);

        // ✅ CHANGEMENT ICI : AuthController au lieu de this
        await AuthController.sendVerificationEmail(user.email, user.name, newToken, user.id);

        return res.status(403).json({
          error: 'Compte non activé. Un nouvel email vous a été envoyé.',
          requiresVerification: true
        });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user });

    } catch (error) {
      console.error("Google Auth Error:", error);
      res.status(401).json({ error: 'Authentification Google échouée' });
    }
  }

  
  // --- 3. LOGIN MANUEL ---
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const { data: user } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();

      if (!user || !user.password) return res.status(401).json({ error: 'Identifiants invalides' });
      if (!user.is_verified) return res.status(403).json({ error: 'Veuillez confirmer votre email.' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user });
    } catch (error) {
      res.status(500).json({ error: 'Erreur login' });
    }
  }

  // --- 4. VERIFY EMAIL ---
  static async verifyEmail(req, res) {
    try {
      const { token, id } = req.query;
      const { data: user } = await supabase.from('users').select('*').eq('id', id).eq('verification_token', token).maybeSingle();

      if (!user) return res.status(400).json({ error: 'Lien invalide ou expiré' });

      const { data: updatedUser } = await supabase
        .from('users')
        .update({ is_verified: true, verification_token: null })
        .eq('id', id)
        .select().single();

      const jwtToken = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userWithoutSecrets } = updatedUser;

      res.json({ message: 'Activé !', token: jwtToken, user: userWithoutSecrets });
    } catch (error) {
      res.status(500).json({ error: 'Erreur vérification' });
    }
  }

  // --- 4. GESTION DU PROFIL ---
  static async getProfile(req, res) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, role, is_verified')
        .eq('id', req.user.id)
        .single();
      if (error || !user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Erreur profil' });
    }
  }

  static async updateProfile(req, res) {
    try {
      const { name, email, newPassword } = req.body;
      let updates = { name, email };

      if (newPassword) {
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select('id, email, name, role')
        .single();

      if (error) throw error;
      res.json({ message: 'Profil mis à jour avec succès', user: updatedUser });
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }
  }

  // --- 6. VÉRIFICATION DU TOKEN (utilisé par le Front au rafraîchissement) ---
  static async verifyToken(req, res) {
    // req.user est rempli par le middleware authenticateToken
    return res.json({
      valid: true,
      user: req.user
    });
  }

  static async logout(req, res) {
    return res.status(200).json({ message: 'Déconnexion réussie' });
  }
}

export default AuthController;