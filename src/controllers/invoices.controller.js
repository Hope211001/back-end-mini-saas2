import supabase from '../config/database.js';

class InvoicesController {

    // GET /api/invoices — liste des mois avec totaux
    static async getMonthly(req, res) {
        try {
            const userId = req.user.id;

            const { data, error } = await supabase
                .from('apify_costs')
                .select('billing_month, cost_eur, cost_usd, items_scraped, run_id, status')
                .eq('user_id', userId)
                .order('billing_month', { ascending: false });

            if (error) throw error;

            // Grouper par billing_month en JS
            const grouped = {};
            for (const row of data) {
                const month = row.billing_month || 'Non défini';
                if (!grouped[month]) {
                    grouped[month] = {
                        billing_month: month,
                        total_eur: 0,
                        total_usd: 0,
                        total_items: 0,
                        run_count: 0,
                    };
                }
                grouped[month].total_eur += parseFloat(row.cost_eur || 0);
                grouped[month].total_usd += parseFloat(row.cost_usd || 0);
                grouped[month].total_items += parseInt(row.items_scraped || 0);
                grouped[month].run_count += 1;
            }

            const result = Object.values(grouped);
            res.json({ data: result });
        } catch (error) {
            console.error('Erreur getMonthly:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/invoices/:month — détail journalier d'un mois
    static async getMonthDetail(req, res) {
        try {
            const userId = req.user.id;
            const { month } = req.params;

            const { data, error } = await supabase
                .from('apify_costs')
                .select('*')
                .eq('user_id', userId)
                .eq('billing_month', month)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Grouper par jour (YYYY-MM-DD)
            const grouped = {};
            for (const row of data) {
                const day = row.created_at
                    ? new Date(row.created_at).toISOString().slice(0, 10)
                    : 'Date inconnue';
                if (!grouped[day]) {
                    grouped[day] = {
                        day,
                        total_eur: 0,
                        total_usd: 0,
                        total_items: 0,
                        run_count: 0,
                        runs: [],
                    };
                }
                grouped[day].total_eur += parseFloat(row.cost_eur || 0);
                grouped[day].total_usd += parseFloat(row.cost_usd || 0);
                grouped[day].total_items += parseInt(row.items_scraped || 0);
                grouped[day].run_count += 1;
                grouped[day].runs.push(row);
            }

            const result = Object.values(grouped).sort((a, b) => b.day.localeCompare(a.day));
            res.json({ data: result });
        } catch (error) {
            console.error('Erreur getMonthDetail:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default InvoicesController;
