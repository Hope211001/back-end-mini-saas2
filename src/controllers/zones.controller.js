import supabase from '../config/database.js';

async function recomputeCoverage() {
    const { data: zones, error } = await supabase.from('zones').select('id, type, codes_postaux, codes_postaux_originaux');
    if (error) throw error;

    const arrondissementCps = new Set();
    const villeOriginauxCps = new Set();
    for (const z of zones) {
        const originaux = z.codes_postaux_originaux || z.codes_postaux || [];
        if (z.type === 'arrondissement') {
            originaux.forEach(cp => arrondissementCps.add(cp));
        } else if (z.type === 'ville') {
            originaux.forEach(cp => villeOriginauxCps.add(cp));
        }
    }

    const updates = [];
    for (const z of zones) {
        const originaux = z.codes_postaux_originaux || z.codes_postaux || [];
        let effective;
        if (z.type === 'arrondissement') {
            effective = [...originaux];
        } else if (z.type === 'ville') {
            effective = originaux.filter(cp => !arrondissementCps.has(cp));
        } else {
            effective = originaux.filter(cp => !arrondissementCps.has(cp) && !villeOriginauxCps.has(cp));
        }
        if (JSON.stringify(effective) !== JSON.stringify(z.codes_postaux || [])) {
            updates.push({ id: z.id, codes_postaux: effective });
        }
    }

    for (const u of updates) {
        const { error: upErr } = await supabase.from('zones').update({ codes_postaux: u.codes_postaux }).eq('id', u.id);
        if (upErr) console.error("recomputeCoverage update error:", upErr.message);
    }

    return updates.length;
}

class ZoneController {
    // 1. Récupérer toutes les zones (pour l'admin/liste)
    // src/controllers/zone.controller.js
    static async getAll(req, res) {
        try {
            const { page, limit, search, statut } = req.query;

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

            if (statut && statut !== "all") {
                query = query.eq('statut_market', statut);
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
            const { nom, price, lat_center, lng_center, codes_postaux, codes_postaux_originaux, type } = req.body;

            const originaux = Array.isArray(codes_postaux_originaux) && codes_postaux_originaux.length > 0
                ? codes_postaux_originaux
                : (Array.isArray(codes_postaux) ? codes_postaux : [codes_postaux]);

            const { data, error } = await supabase
                .from('zones')
                .insert([{
                    nom,
                    price: parseFloat(price) || 0,
                    lat_center: parseFloat(lat_center),
                    lng_center: parseFloat(lng_center),
                    codes_postaux: originaux,
                    codes_postaux_originaux: originaux,
                    type: ['departement', 'arrondissement'].includes(type) ? type : 'ville',
                    statut_market: 'LIBRE'
                }])
                .select()
                .single();

            if (error) throw error;

            await recomputeCoverage();

            const { data: refreshed } = await supabase.from('zones').select('*').eq('id', data.id).single();
            res.status(201).json(refreshed || data);
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
            const body = { ...req.body };

            if (Array.isArray(body.codes_postaux_originaux) && body.codes_postaux_originaux.length > 0) {
                body.codes_postaux = body.codes_postaux_originaux;
            } else if (Array.isArray(body.codes_postaux) && body.codes_postaux.length > 0) {
                body.codes_postaux_originaux = body.codes_postaux;
            }

            const { data, error } = await supabase.from('zones').update(body).eq('id', id).select().single();
            if (error) throw error;

            await recomputeCoverage();

            const { data: refreshed } = await supabase.from('zones').select('*').eq('id', id).single();
            res.json(refreshed || data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { error } = await supabase.from('zones').delete().eq('id', id);
            if (error) throw error;

            await recomputeCoverage();

            res.json({ message: 'Zone supprimée' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


    // Compter TOUTES les zones
    static async countAllZone(req, res) {
        try {
            // "head: true" signifie : ne récupère pas les données, donne juste le nombre (plus rapide)
            const { count, error } = await supabase
                .from('zones')
                .select('*', { count: 'exact'});

            if (error) throw error;
            
            // On renvoie le vrai chiffre
            res.json({ count: count || 0 });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Compter les zones LIBRES
    static async countZoneLibre(req, res) {
        try {
            const { count, error } = await supabase
                .from('zones')
                .select('*', { count: 'exact'})
                .eq('statut_market', 'LIBRE');

            if (error) throw error;
            
            res.json({ count: count || 0 });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // Compter les zones VENDUES
    static async countZoneVendu(req, res) {
        try {
            const { count, error } = await supabase
                .from('zones')
                .select('*', { count: 'exact' })
                .eq('statut_market', 'VENDU'); // Assure-toi que c'est bien 'VENDU' et pas 'vendu' dans ta base

            if (error) throw error;
            
            res.json({ count: count || 0 });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }


}

export default ZoneController;