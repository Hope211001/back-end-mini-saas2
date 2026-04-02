import supabase from '../config/database.js';

class CookiesController {
    // Récupérer le cookie de l'utilisateur connecté
    static async getMyCookie(req, res) {
        try {
            const userId = req.user.id;

            const { data, error } = await supabase
                .from('cookies')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

            res.json({ cookie: data || null });
        } catch (error) {
            console.error("Erreur getMyCookie:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async upsertCookie(req, res) {
        try {
            const userId = req.user.id;
            const { cookies, mail_leboncoin, password_leboncoin } = req.body;

            if (!cookies || !cookies.trim()) {
                return res.status(400).json({ error: "Le cookie est obligatoire." });
            }
            if (!mail_leboncoin || !mail_leboncoin.trim()) {
                return res.status(400).json({ error: "L'email LeBonCoin est obligatoire." });
            }
            if (!password_leboncoin || !password_leboncoin.trim()) {
                return res.status(400).json({ error: "Le mot de passe LeBonCoin est obligatoire." });
            }

            const payload = { cookies, mail_leboncoin, password_leboncoin };

            const { data: existing } = await supabase
                .from('cookies')
                .select('id')
                .eq('user_id', userId)
                .single();

            let data, error;

            if (existing) {
                ({ data, error } = await supabase
                    .from('cookies')
                    .update(payload)
                    .eq('user_id', userId)
                    .select()
                    .single());
            } else {
                ({ data, error } = await supabase
                    .from('cookies')
                    .insert({ user_id: userId, ...payload })
                    .select()
                    .single());
            }

            if (error) throw error;

            res.json({ message: existing ? 'Configuration mise à jour' : 'Configuration enregistrée', cookie: data });
        } catch (error) {
            console.error("Erreur upsertCookie:", error);
            res.status(500).json({ error: error.message });
        }
    }

    static async deleteCookie(req, res) {
        try {
            const userId = req.user.id;

            const { error } = await supabase
                .from('cookies')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            res.json({ message: 'Cookie supprimé' });
        } catch (error) {
            console.error("Erreur deleteCookie:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default CookiesController;
