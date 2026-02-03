// src/controllers/config.controller.js
import supabase from '../config/database.js';

class ConfigController {
  // Récupérer la config de l'utilisateur connecté
  static async getConfig(req, res) {
    try {
      const userId = req.user.id;

      const { data, error } = await supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = aucun résultat trouvé (pas grave)
        throw error;
      }

      // Si aucune config n'existe, on renvoie des valeurs par défaut
      res.json(data || { 
        loyer_max: 1500, 
        surface_min: 25, 
        auto_contact: false, 
        template_msg_1: "" 
      });
    } catch (error) {
      console.error('❌ GetConfig Error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération de la configuration' });
    }
  }

  // Mettre à jour ou Créer la config (Upsert)
  static async updateConfig(req, res) {
    try {
      const userId = req.user.id;
      const { 
        loyer_max, 
        surface_min, 
        auto_contact, 
        template_msg_1, 
        template_msg_2, 
        template_msg_3 
      } = req.body;

      const { data, error } = await supabase
        .from('user_configs')
        .upsert({
          user_id: userId, // La clé primaire UUID
          loyer_max,
          surface_min,
          auto_contact,
          template_msg_1,
          template_msg_2,
          template_msg_3,
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        message: 'Configuration mise à jour avec succès',
        config: data
      });
    } catch (error) {
      console.error('❌ UpdateConfig Error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la mise à jour de la configuration' });
    }
  }
}

export default ConfigController;