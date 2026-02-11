import supabase from '../config/database.js';
import AuthController from './auth.controller.js';

class UserController {
    static async getAll(req, res) {
        try {
            const { page, limit, search, status } = req.query;
            const p = parseInt(page) || 1;
            const l = parseInt(limit) || 10;
            const from = (p - 1) * l;
            const to = from + l - 1;

            // Filtre de base : Exclure systématiquement les 'SUPPRIME'
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' })
                .neq('statut', 'SUPPRIME');

            if (search && search.trim() !== "") {
                const s = search.trim();
                query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
            }

            if (status && status !== "all") {
                query = query.eq('statut', status);
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            res.json({
                data,
                totalCount: count,
                totalPages: Math.ceil(count / l)
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            await AuthController.register(req, res);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase.from('users').update(req.body).eq('id', id).select();
            if (error) throw error;
            res.json(data[0]);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase
                .from('users')
                .update({ statut: 'SUPPRIME' })
                .eq('id', id)
                .select();

            if (error) throw error;
            res.json({ message: "Utilisateur supprimé", data: data[0] });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    static async blocked(req, res) {
        try {
            const { id } = req.params;
            const { data: user } = await supabase.from('users').select('statut').eq('id', id).single();

            const newStatus = user.statut === 'BLOQUE' ? 'ACTIF' : 'BLOQUE';

            const { data, error } = await supabase
                .from('users')
                .update({ statut: newStatus })
                .eq('id', id)
                .select();

            if (error) throw error;
            res.json({ message: `Utilisateur ${newStatus}`, data: data[0] });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}
export default UserController;