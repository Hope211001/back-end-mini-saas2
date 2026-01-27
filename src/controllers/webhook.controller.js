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

      const { error } = await supabase
        .from('zones')
        .update({
          owner_id: userId,        // 👈 On met l'ID de l'acheteur ici
          statut_market: 'VENDU'   // 👈 On change le statut
        })
        .eq('id', zoneId);
    }
    res.json({ received: true });
  }
}
export default WebhookController;