// src/controllers/webhook.controller.js
import stripe from '../config/stripe.js';
import supabase from '../config/database.js';

class WebhookController {
  static async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    console.log('🔔 Webhook Stripe reçu');
    console.log('  - signature présente:', !!sig);
    console.log('  - body est Buffer:', Buffer.isBuffer(req.body));
    console.log('  - STRIPE_WEBHOOK_SECRET défini:', !!process.env.STRIPE_WEBHOOK_SECRET);

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET manquant dans les variables d\'environnement');
      return res.status(500).send('Webhook secret not configured');
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      console.log(`✅ Signature vérifiée — event type: ${event.type}`);
    } catch (err) {
      console.error('❌ Erreur vérification signature:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { userId, zoneId } = session.metadata;

      console.log(`\n📦 --- DÉBUT TRAITEMENT WEBHOOK ---`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`🗺️ Zone ID: ${zoneId}`);

      try {
        // 1. CALCUL DE LA DATE (1 mois à partir d'aujourd'hui)
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        const dateFinISO = d.toISOString();
        
        console.log(`📅 DATE FIN CALCULÉE : ${dateFinISO}`);

        // 2. MISE À JOUR DE LA ZONE
        const { error: updateError } = await supabase
          .from('zones')
          .update({ 
            owner_id: userId, 
            statut_market: 'VENDU' 
          })
          .eq('id', zoneId);

        if (updateError) throw updateError;
        console.log("✅ Étape 1/2 : Table 'zones' mise à jour.");

        // 3. INSERTION / UPDATE DE L'ABONNEMENT
        const { error: insertError } = await supabase
          .from('subscriptions')
          .upsert([
            {
              user_id: userId,
              zone_id: zoneId,
              is_active: true, // Vérifie bien le 'e' final (SQL: is_active)
              date_fin: dateFinISO
            }
          ], { onConflict: 'zone_id' }); 

        // 4. INSERTION / UPDATE user config pour le template
           const { error: insertErrorTemplate } = await supabase
          .from('user_configs')
          .upsert([
            {
              user_id: userId,
              template_msg_1:"Bonjour {{owner_name}}, je suis intéressé par votre bien à {{ville}}. Dispo ?"
            }
          ], { onConflict: 'user_id' }); 

        if (insertErrorTemplate) {
          console.error("❌ Erreur Détailée Supabase user config:", insertErrorTemplate);
          throw insertErrorTemplate;
        }


        // 5. INSERTION subscriptions_details
          const now = new Date();
          const created_at = now.toISOString();
          const { error: insertSubscriptionDetails } = await supabase
          .from('subscriptions_details')
          .insert([
            {
              user_id : userId,
              zone_id : zoneId,
              created_at : created_at ,
              date_debut :  created_at,
              date_fin : dateFinISO
            }
          ]); 

          if (insertSubscriptionDetails) {
          console.error("❌ Erreur Détailée Supabase user config:", insertSubscriptionDetails);
          throw insertErrorTemplate;
        }

        console.log(`✅ Étape 3/3 : Abonnement créé jusqu'au ${dateFinISO}`);
        console.log(`🚀 --- TRAITEMENT TERMINÉ AVEC SUCCÈS ---\n`);

      } catch (dbError) {
        console.error(`❌ ERREUR CRITIQUE DB:`, dbError.message);
        return res.status(500).json({ error: "DB Error", details: dbError.message });
      }
    }
    res.json({ received: true });
  }
}

export default WebhookController;