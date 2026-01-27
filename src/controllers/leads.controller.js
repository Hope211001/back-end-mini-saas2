import supabase from '../config/database.js';

class LeadController {
    // Pour l'admin : voir tous les leads de la plateforme
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const { data, error, count } = await supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .order('date_detection', { ascending: false })
                .range(from, to);

            if (error) throw error;
            res.json({ data, totalCount: count, totalPages: Math.ceil(count / limit) });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Pour l'utilisateur : voir uniquement SES leads
    static async getMyLeads(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            
            const userId = req.user.id; // Extrait du JWT

            const { data, error, count } = await supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('assigned_user_id', userId) // Utilisation de la bonne colonne
                .order('date_detection', { ascending: false })
                .range(from, to);

            if (error) throw error;

            res.json({ 
                data, 
                totalCount: count, 
                totalPages: Math.ceil(count / (limit || 1)) 
            });
        } catch (error) {
            console.error("Erreur getMyLeads:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default LeadController;