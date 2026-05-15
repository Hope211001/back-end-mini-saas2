-- Ajouter la colonne
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS message_ia TEXT;

-- Activer Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Inclure la ligne complete dans les UPDATE events
ALTER TABLE public.leads REPLICA IDENTITY FULL;


-- Recréer la policy "Allow read all" pour tous les rôles (anon inclus)
DROP POLICY IF EXISTS "Allow read all" ON public.leads;

CREATE POLICY "Allow read all"
  ON public.leads
  FOR SELECT
  TO public        -- public = anon + authenticated + tout role
  USING (true);
