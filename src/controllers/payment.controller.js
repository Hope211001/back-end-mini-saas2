// src/controllers/payment.controller.js
import stripe from '../config/stripe.js';
import supabase from '../config/database.js';

class PaymentController {
  static async createCheckoutSession(req, res) {
    try {
      const { zoneId } = req.body;
      const userId = req.user.id;

      // 1. On récupère la zone
      const { data: zone, error } = await supabase
        .from('zones')
        .select('*')
        .eq('id', zoneId)
        .single();

      // VÉRIFICATION 1 : Est-ce que la zone existe ?
      if (error || !zone) {
        console.error("❌ Zone non trouvée:", error);
        return res.status(404).json({ error: "Ville non trouvée dans la base de données" });
      }

      // VÉRIFICATION 2 : Est-ce que le prix existe et est valide ?
      // Remplace 'price' par le nom exact de ta colonne dans Supabase (ex: 'tarif' ?)
      const priceValue = parseFloat(zone.price); 
      
      if (isNaN(priceValue)) {
        console.error("❌ Le prix de la zone est invalide ou inexistant:", zone.price);
        return res.status(400).json({ error: "Le prix de cette ville n'est pas configuré" });
      }

      // URL de base du front : en priorité l'Origin du navigateur (marche en local ET en prod),
      // sinon la variable d'env FRONTEND_URL, sinon fallback localhost
      const frontendUrl =
        req.headers.origin ||
        req.headers.referer?.replace(/\/$/, '') ||
        process.env.FRONTEND_URL ||
        'http://localhost:8080';

      // 2. Création de la session Stripe
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Achat ville : ${zone.nom}`,
              },
              // On s'assure que c'est un entier (centimes)
              unit_amount: Math.round(priceValue * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${frontendUrl}/client/zones`,
        cancel_url: `${frontendUrl}/client/buy-zone`,
        metadata: {
          userId: userId,
          zoneId: zoneId.toString() // On s'assure que c'est une string pour les metadata
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('❌ Erreur Stripe:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
}

export default PaymentController;
