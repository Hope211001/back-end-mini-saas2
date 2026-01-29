import supabase from '../config/database.js';

class ZoneController {
    // 1. Récupérer toutes les zones (pour l'admin/liste)
    // src/controllers/zone.controller.js
    static async getAll(req, res) {
        try {
            const { page, limit, search } = req.query;

            console.log("🔍 Paramètres reçus du Front:", { page, limit, search });

            const p = parseInt(page) || 1;
            const l = parseInt(limit) || 10;
            const from = (p - 1) * l;
            const to = from + l - 1;

            let query = supabase
                .from('zones')
                .select('*', { count: 'exact' });

            // LOGIQUE DE RECHERCHE CORRIGÉE
            if (search && search.trim() !== "") {
                const s = search.trim();
                // On cherche dans le nom OU si le CP est présent
                // Attention : .cs (contains) cherche une correspondance EXACTE dans le tableau
                // Si tu veux une recherche partielle dans le nom, on utilise ilike
                query = query.or(`nom.ilike.%${s}%, codes_postaux.cs.{"${s}"}`);
            }

            const { data, error, count } = await query
                .order('nom', { ascending: true })
                .range(from, to);

            if (error) {
                console.error("❌ Erreur Supabase Query:", error);
                throw error;
            }

            res.json({
                data,
                totalCount: count,
                totalPages: Math.ceil(count / l)
            });
        } catch (error) {
            console.error("❌ Erreur Controller:", error.message);
            res.status(500).json({ error: error.message });
        }
    }

    // 2. Créer une nouvelle zone
    static async create(req, res) {
        try {
            const { nom, price, lat_center, lng_center, codes_postaux } = req.body;

            const { data, error } = await supabase
                .from('zones')
                .insert([{
                    nom,
                    price: parseFloat(price) || 0,
                    lat_center: parseFloat(lat_center),
                    lng_center: parseFloat(lng_center),
                    codes_postaux: Array.isArray(codes_postaux) ? codes_postaux : [codes_postaux],
                    statut_market: 'LIBRE'
                }])
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // 3. IMPORTANT : Pour l'affichage sur la CARTE
    static async getMapStatus(req, res) {
        try {
            // On ajoute lat_center et lng_center sinon Leaflet ne sait pas où dessiner
            const { data, error } = await supabase
                .from('zones')
                .select('*');
            if (error) throw error;
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 4. Vérifier si un Code Postal est déjà pris
    static async checkZoneExclusivity(req, res) {
        const { cp } = req.params;
        try {
            const { data, error } = await supabase
                .from('zones')
                .select('*')
                .contains('codes_postaux', [cp]); // On cherche si le CP est dans l'array

            if (error) throw error;

            // Si data est vide, la zone n'existe pas en base
            if (!data || data.length === 0) {
                return res.json({ available: true, zone: null });
            }

            const zone = data[0];
            res.json({
                available: zone.statut_market === 'LIBRE',
                zone: zone
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    // 5. Voir les zones achetées par l'utilisateur connecté
    static async getMyOwnedZones(req, res) {
        try {
            const userId = req.user.id;
            const { data, error } = await supabase
                .from('zones')
                .select('*')
                .eq('owner_id', userId);

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Standard Update/Delete
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { data, error } = await supabase.from('zones').update(req.body).eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('zones').delete().eq('id', id);
            if (error) throw error;
            res.json({ message: 'Zone supprimée' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default ZoneController;