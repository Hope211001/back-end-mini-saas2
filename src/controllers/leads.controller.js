import supabase from '../config/database.js';

class LeadController {
    static async getAll(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            const { search, statut, phone, sort, ville, categorie } = req.query;

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

            if (categorie && categorie !== 'all') {
                query = query.eq('categorie_scraping', categorie);
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

    static async getStatsByPhone(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('date_detection, phone');

            if (error) throw error;

            const dailyMap = {};
            const monthlyMap = {};

            for (const lead of data) {
                const date = lead.date_detection ? lead.date_detection.substring(0, 10) : null;
                if (!date) continue;
                const month = date.substring(0, 7);
                const hasPhone = lead.phone && lead.phone.trim() !== '';
                const key = hasPhone ? 'avec_tel' : 'sans_tel';

                if (!dailyMap[date]) dailyMap[date] = { avec_tel: 0, sans_tel: 0 };
                dailyMap[date][key]++;

                if (!monthlyMap[month]) monthlyMap[month] = { avec_tel: 0, sans_tel: 0 };
                monthlyMap[month][key]++;
            }

            const daily = Object.entries(dailyMap)
                .map(([date, vals]) => ({ date, ...vals }))
                .sort((a, b) => a.date.localeCompare(b.date));

            const monthly = Object.entries(monthlyMap)
                .map(([month, vals]) => ({ month, ...vals }))
                .sort((a, b) => a.month.localeCompare(b.month));

            res.json({ daily, monthly });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getStatsByUser(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('assigned_user_id, users:assigned_user_id (name, email)');

            if (error) throw error;

            const userMap = {};
            for (const lead of data) {
                const userId = lead.assigned_user_id;
                if (!userId) continue;
                if (!userMap[userId]) {
                    userMap[userId] = {
                        id: userId,
                        name: lead.users?.name || 'Sans nom',
                        email: lead.users?.email || '',
                        count: 0,
                    };
                }
                userMap[userId].count++;
            }

            const result = Object.values(userMap).sort((a, b) => b.count - a.count);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getStatsByVille(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('ville');

            if (error) throw error;

            const villeMap = {};
            for (const lead of data) {
                const ville = lead.ville || 'Inconnue';
                villeMap[ville] = (villeMap[ville] || 0) + 1;
            }

            const result = Object.entries(villeMap)
                .map(([ville, count]) => ({ ville, count }))
                .sort((a, b) => b.count - a.count);

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getStats(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('date_detection, categorie_scraping');

            if (error) throw error;

            const dailyMap = {};
            const monthlyMap = {};

            for (const lead of data) {
                const cat = lead.categorie_scraping || 'autre';
                const date = lead.date_detection ? lead.date_detection.substring(0, 10) : null;
                if (!date) continue;
                const month = date.substring(0, 7);

                if (!dailyMap[date]) dailyMap[date] = {};
                dailyMap[date][cat] = (dailyMap[date][cat] || 0) + 1;

                if (!monthlyMap[month]) monthlyMap[month] = {};
                monthlyMap[month][cat] = (monthlyMap[month][cat] || 0) + 1;
            }

            const daily = Object.entries(dailyMap)
                .map(([date, cats]) => ({ date, ...cats }))
                .sort((a, b) => a.date.localeCompare(b.date));

            const monthly = Object.entries(monthlyMap)
                .map(([month, cats]) => ({ month, ...cats }))
                .sort((a, b) => a.month.localeCompare(b.month));

            res.json({ daily, monthly });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async showLead(req, res) {
        try {
            const { id } = req.params;

            const { data, error } = await supabase
                .from('leads')
                .select(`
                    *,
                    zones (nom),
                    users:assigned_user_id (id, name, email)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) return res.status(404).json({ error: "Lead introuvable" });

            res.json(data);
        } catch (error) {
            console.error("Erreur showLead:", error);
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

    static async getDistinctCategories(req, res) {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('categorie_scraping');

            if (error) throw error;

            const categories = [...new Set(data.map(d => d.categorie_scraping).filter(Boolean))].sort();
            res.json(categories);
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
            const { search, statut, phone, sort, zone_id, exclude_statut, categorie } = req.query;

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

            if (categorie && categorie !== 'all') {
                query = query.eq('categorie_scraping', categorie);
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

            // Choix du webhook selon la catégorie du lead
            const webhookUrl = lead.categorie_scraping === 'pap.fr'
                ? 'https://n8n.srv903010.hstgr.cloud/webhook/contact-avec-pap'
                : 'https://n8n.srv903010.hstgr.cloud/webhook/contact-manuel';

            const webhookRes = await fetch(webhookUrl, {
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
            const { search, statut, phone, sort, zone_id, exclude_statut, categorie } = req.query;

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
            if (categorie && categorie !== 'all') {
                query = query.eq('categorie_scraping', categorie);
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