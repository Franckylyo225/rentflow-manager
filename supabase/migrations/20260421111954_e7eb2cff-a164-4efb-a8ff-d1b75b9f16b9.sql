-- Ajout d'une clé d'événement pour dédupliquer les relances de manière forte
ALTER TABLE public.sms_history
  ADD COLUMN IF NOT EXISTS event_key text;

-- Index unique partiel : empêche d'enregistrer 2 fois le même événement de relance "sent"
-- (un seul SMS par paiement + template + jour relatif)
CREATE UNIQUE INDEX IF NOT EXISTS sms_history_event_key_unique
  ON public.sms_history (event_key)
  WHERE event_key IS NOT NULL AND status = 'sent';
