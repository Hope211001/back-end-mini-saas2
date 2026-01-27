// src/config/database.js
import { createClient } from '@supabase/supabase-js';

// Les variables sont déjà chargées par index.js
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('❌ Variables Supabase manquantes dans .env');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('✅ Client Supabase initialisé');

export default supabase;