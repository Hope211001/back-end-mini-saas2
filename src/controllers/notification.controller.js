import supabase from '../config/database.js';

class NotificationController {
    
    static async getMyNotifications(req, res) {
        try {
            const userId = req.user.id;

            // ON UTILISE 'date_detection' AU LIEU DE 'created_at'
            const { data, error } = await supabase
                .from('leads')
                .select('*') 
                .eq('assigned_user_id', userId)
                .order('date_detection', { ascending: false }) // Tri par date de détection
                .limit(20);

            if (error) throw error;

            const unreadCount = data.filter(n => !n.is_read).length;

            res.json({ 
                notifications: data, 
                unreadCount 
            });

        } catch (error) {
            console.error("Erreur getMyNotifications:", error);
            res.status(500).json({ error: error.message });
        }
    }

    // ... le reste (markAsRead, markAllRead) reste identique ...
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { error } = await supabase.from('leads').update({ is_read: true }).eq('id', id).eq('assigned_user_id', userId);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }

    static async markAllRead(req, res) {
        try {
            const userId = req.user.id;
            const { error } = await supabase.from('leads').update({ is_read: true }).eq('assigned_user_id', userId).eq('is_read', false);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) { res.status(500).json({ error: error.message }); }
    }
}

export default NotificationController;