// src/controllers/webhook.controller.js
import stripe from '../config/stripe.js';
import supabase from '../config/database.js';


class WebhookController {
  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

    if (event.type === 'checkout.session.completed') {
      // Dans ton Webhook après checkout.session.completed
      const session = event.data.object;
      const { userId, zoneId } = session.metadata;

      try {
        // 1. Mise à jour de la zone (Changement de propriétaire)
        const { error: updateError } = await supabase
          .from('zones')
          .update({
            owner_id: userId,
            statut_market: 'VENDU'
          })
          .eq('id', zoneId);

        if (updateError) throw new Error(`Update Zone: ${updateError.message}`);

        // 2. Création de l'abonnement (Utilisation de .insert au lieu de .create)
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert([
            {
              user_id: userId,
              zone_id: zoneId,
              is_actif: true
            }
          ]);

        if (insertError) throw new Error(`Insert Subscription: ${insertError.message}`);

        console.log(`✅ Commande traitée avec succès pour l'user ${userId} sur la zone ${zoneId}`);

      } catch (dbError) {
        console.error(`❌ Erreur Base de données: ${dbError.message}`);
        // On renvoie un 500 pour que Stripe réessaie le webhook plus tard
        return res.status(500).json({ error: "Database operation failed" });
      }
    }
    res.json({ received: true });
  }
}
export default WebhookController;