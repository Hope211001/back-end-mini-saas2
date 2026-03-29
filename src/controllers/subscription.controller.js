// src/controllers/subscription.controller.js
import supabase from '../config/database.js';

class SubscriptionController {

    static async getSubscriptionByZone(req, res) {
        try {
            const userId = req.user.id;
            const { zoneId } = req.params;

            const { data, error } = await supabase
                .from('zones') // IMPORTANT : On lit dans 'zones'
                .select(`
                id, 
                owner_id, 
                nom, 
                auto_contact_enabled, 
                price_max_filter, 
                price_min_filter, 
                surface_min_filter, 
                "searchQuery", 
                category_id, 
                radius, 
                template_message
            `)
                .eq('id', zoneId)
                .eq('owner_id', userId) // Sécurité
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({ error: "Zone non trouvée" });
            }

            res.json(data);
        } catch (error) {
            console.error("Erreur Backend:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    static async updateByZone(req, res) {
        try {
            const userId = req.user.id;
            const { zoneId } = req.params;
            const body = req.body;

            const updateData = {
                auto_contact_enabled: !!body.auto_contact_enabled,
                searchQuery: body.searchQuery || "",
                price_min_filter: (body.price_min_filter !== "" && body.price_min_filter !== null) ? parseInt(body.price_min_filter, 10) : null,
                price_max_filter: (body.price_max_filter !== "" && body.price_max_filter !== null) ? parseInt(body.price_max_filter, 10) : null,
                surface_min_filter: (body.surface_min_filter !== "" && body.surface_min_filter !== null) ? parseInt(body.surface_min_filter, 10) : null,
                radius: (body.radius !== "" && body.radius !== null) ? parseInt(body.radius, 10) : null,
                category_id: body.category_id ? parseInt(body.category_id, 10) : null,
                template_message: body.template_message || "",
            };

            const { data, error } = await supabase
                .from('zones') // <--- ON ÉCRIT DANS 'ZONES'
                .update(updateData)
                .eq('id', zoneId)
                .eq('owner_id', userId)
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