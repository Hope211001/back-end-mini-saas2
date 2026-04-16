import nodemailer from 'nodemailer';
import supabase from '../config/database.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s+/g, ''),
    },
});

class ContactController {
    // POST /api/contact - public
    static async send(req, res) {
        try {
            const { name, email, subject, message } = req.body;

            if (!name || !email || !subject || !message) {
                return res.status(400).json({ error: 'Tous les champs sont requis.' });
            }

            // Sauvegarder en base
            const { error: dbError } = await supabase
                .from('contacts')
                .insert({ name, email, subject, message });

            if (dbError) {
                console.error('Erreur DB contact:', dbError);
                return res.status(500).json({ error: `Erreur DB: ${dbError.message}` });
            }

            // Email vers l'admin (non bloquant)
            transporter.sendMail({
                from: `"ImmoScout Contact" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                replyTo: email,
                subject: `[Contact] ${subject}`,
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
                        <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Nouveau message de contact</h1>
                        </div>
                        <div style="padding: 32px; color: #e2e8f0;">
                            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Expediteur</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600;">${name}</p>
                                <p style="margin: 4px 0 0 0; color: #60a5fa;">${email}</p>
                            </div>
                            <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Sujet</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600;">${subject}</p>
                            </div>
                            <div style="background: #1e293b; border-radius: 12px; padding: 20px;">
                                <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Message</p>
                                <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
                            </div>
                        </div>
                    </div>
                `,
            }).catch(err => console.error('Erreur email admin:', err));

            // Email de confirmation (non bloquant)
            transporter.sendMail({
                from: `"ImmoScout" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `Nous avons bien recu votre message - ImmoScout`,
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
                        <div style="background: linear-gradient(135deg, #3b82f6, #6366f1); padding: 32px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Merci ${name} !</h1>
                        </div>
                        <div style="padding: 32px; color: #e2e8f0;">
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                Nous avons bien recu votre message concernant <strong>"${subject}"</strong>.
                            </p>
                            <p style="font-size: 16px; line-height: 1.6;">
                                Notre equipe vous repondra dans les plus brefs delais.
                            </p>
                        </div>
                    </div>
                `,
            }).catch(err => console.error('Erreur email confirmation:', err));

            res.json({ success: true, message: 'Message envoye avec succes.' });
        } catch (error) {
            console.error('Erreur envoi contact:', error);
            res.status(500).json({ error: 'Erreur lors de l\'envoi du message.' });
        }
    }

    // GET /api/contact - admin only
    static async getAll(req, res) {
        try {
            const { data, error } = await supabase
                .from('contacts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/contact/:id - admin only
    static async remove(req, res) {
        try {
            const { id } = req.params;
            const { error } = await supabase
                .from('contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

export default ContactController;
