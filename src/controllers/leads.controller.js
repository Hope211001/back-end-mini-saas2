import supabase from '../config/database.js';

class LeadController {
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            const { search, statut, phone, sort, ville } = req.query;

            const ascending = sort === 'asc';

            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .order('date_detection', { ascending });

            if (search) {
                query = query.or(`titre.ilike.%${search}%,ville.ilike.%${search}%`);
            }

            if (statut && statut !== 'all') {
                query = query.eq('statut', statut);
            }

            if (ville && ville !== 'all') {
                query = query.eq('ville', ville);
            }

            if (phone === 'with_phone') {
                query = query.not('phone', 'is', null).neq('phone', '');
            } else if (phone === 'without_phone') {
                query = query.or('phone.is.null,phone.eq.');
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;
            res.json({ data, totalCount: count, totalPages: Math.ceil(count / limit) });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getDistinctVilles(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('ville');

            if (error) throw error;

            const villes = [...new Set(data.map(d => d.ville).filter(Boolean))].sort();
            res.json(villes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getLeadsByUser(req, res) {
        try {
            const { userId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            const { search, statut, phone, sort, ville } = req.query;

            const ascending = sort === 'asc';

            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('assigned_user_id', userId)
                .order('date_detection', { ascending });

            if (search) {
                query = query.or(`titre.ilike.%${search}%,ville.ilike.%${search}%`);
            }

            if (statut && statut !== 'all') {
                query = query.eq('statut', statut);
            }

            if (ville && ville !== 'all') {
                query = query.eq('ville', ville);
            }

            if (phone === 'with_phone') {
                query = query.not('phone', 'is', null).neq('phone', '');
            } else if (phone === 'without_phone') {
                query = query.or('phone.is.null,phone.eq.');
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;
            res.json({ data, totalCount: count, totalPages: Math.ceil(count / limit) });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getMyLeads(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            const userId = req.user.id;
            const { search, statut, phone, sort, zone_id, exclude_statut } = req.query;

            const ascending = sort === 'asc';

            let query = supabase
                .from('leads')
                .select('*', { count: 'exact' })
                .eq('assigned_user_id', userId)
                .order('date_detection', { ascending });

            if (zone_id && zone_id !== 'all') {
                query = query.eq('zone_id', zone_id);
            }

            if (search) {
                query = query.or(`titre.ilike.%${search}%,ville.ilike.%${search}%`);
            }

            if (statut && statut !== 'all') {
                query = query.eq('statut', statut);
            }

            if (exclude_statut) {
                const excludes = exclude_statut.split(',');
                for (const ex of excludes) {
                    query = query.neq('statut', ex.trim());
                }
            }

            if (phone === 'with_phone') {
                query = query.not('phone', 'is', null).neq('phone', '');
            } else if (phone === 'without_phone') {
                query = query.or('phone.is.null,phone.eq.');
            }

            const { data, error, count } = await query.range(from, to);

            if (error) throw error;

            res.json({
                data,
                totalCount: count,
                totalPages: Math.ceil(count / limit)
            });
        } catch (error) {
            console.error("Erreur getMyLeads:", error);
            res.status(500).json({ error: error.message });
        }
    }


    static async showMyLead(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const { data, error } = await supabase
                .from('leads')
                .select(`
                *,
                zones (nom),
                users (email)
            `) // On demande toutes les colonnes de leads + le nom de la zone + l'email de l'user
                .eq('id', id)
                .eq('assigned_user_id', userId)
                .single();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({ error: "Lead introuvable" });
            }

            res.json(data);
        } catch (error) {
            console.error("Erreur showMyLead:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async contactLead(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { message } = req.body;

            // Vérifier que le lead appartient à l'utilisateur
            const { data: lead, error } = await supabase
                .from('leads')
                .select('*')
                .eq('id', id)
                .eq('assigned_user_id', userId)
                .single();

            if (error) throw error;
            if (!lead) return res.status(404).json({ error: "Lead introuvable" });

            // Appeler le webhook n8n avec le lead + message
            const webhookRes = await fetch('https://n8n.srv903010.hstgr.cloud/webhook/contact-manuel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...lead, message: message || '' }),
            });

            if (!webhookRes.ok) {
                throw new Error(`Webhook n8n a répondu avec le statut ${webhookRes.status}`);
            }

            res.json({ message: 'Lead contacté avec succès', lead });
        } catch (error) {
            console.error("Erreur contactLead:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async updateStatus(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { statut } = req.body;

            const validStatuts = ['new', 'contacted', 'replied', 'rejected', 'unreachable'];
            if (!validStatuts.includes(statut)) {
                return res.status(400).json({ error: `Statut invalide. Valeurs acceptées : ${validStatuts.join(', ')}` });
            }

            const { data, error } = await supabase
                .from('leads')
                .update({ statut })
                .eq('id', id)
                .eq('assigned_user_id', userId)
                .select()
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: "Lead introuvable" });

            res.json(data);
        } catch (error) {
            console.error("Erreur updateStatus:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async exportCSV(req, res) {
        try {
            const userId = req.user.id;
            const { search, statut, phone, sort, zone_id, exclude_statut } = req.query;

            const ascending = sort === 'asc';

            let query = supabase
                .from('leads')
                .select('*')
                .eq('assigned_user_id', userId)
                .order('date_detection', { ascending });

            if (zone_id && zone_id !== 'all') {
                query = query.eq('zone_id', zone_id);
            }
            if (search) {
                query = query.or(`titre.ilike.%${search}%,ville.ilike.%${search}%`);
            }
            if (statut && statut !== 'all') {
                query = query.eq('statut', statut);
            }
            if (exclude_statut) {
                const excludes = exclude_statut.split(',');
                for (const ex of excludes) {
                    query = query.neq('statut', ex.trim());
                }
            }
            if (phone === 'with_phone') {
                query = query.not('phone', 'is', null).neq('phone', '');
            } else if (phone === 'without_phone') {
                query = query.or('phone.is.null,phone.eq.');
            }

            const { data, error } = await query;
            if (error) throw error;

            // Colonnes CSV
            const columns = ['id', 'titre', 'ville', 'prix', 'surface', 'phone', 'owner_name', 'statut', 'date_detection', 'url'];
            const headers = ['ID', 'Titre', 'Ville', 'Prix', 'Surface', 'Téléphone', 'Propriétaire', 'Statut', 'Date détection', 'URL'];

            // Escape CSV value
            const esc = (val) => {
                if (val == null) return '';
                const str = String(val).replace(/"/g, '""');
                return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
            };

            const csvRows = [headers.join(',')];
            for (const row of data) {
                csvRows.push(columns.map(col => esc(row[col])).join(','));
            }

            const csv = '\uFEFF' + csvRows.join('\n'); // BOM UTF-8 pour Excel

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
            res.send(csv);
        } catch (error) {
            console.error("Erreur exportCSV:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default LeadController;