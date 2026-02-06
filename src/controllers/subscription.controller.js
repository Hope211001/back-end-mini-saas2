import supabase from '../config/database.js';

class SubscriptionController {
    // src/controllers/subscription.controller.js

    static async getSubscriptionByZone(req, res) {
        try {
            const userId = req.user.id;
            const { zoneId } = req.params;

            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .eq('zone_id', zoneId)
                .maybeSingle(); // <--- CHANGER ICI (au lieu de .single())

            if (error) throw error;

            // Si aucune souscription n'est trouvée, on renvoie un objet par défaut 
            // ou un message clair au lieu d'une erreur 500
            if (!data) {
                return res.status(404).json({ error: "Aucun abonnement trouvé pour cette zone" });
            }

            res.json(data);
        } catch (error) {
            console.error("Erreur serveur:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async updateByZone(req, res) {
        try {
            const userId = req.user.id;
            const { zoneId } = req.params;
            const { auto_contact_enabled } = req.body;

            const { data, error } = await supabase
                .from('subscriptions')
                .update({ auto_contact_enabled })
                .eq('user_id', userId)
                .eq('zone_id', zoneId)
                .select()
                .single();

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default SubscriptionController;