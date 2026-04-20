ALTER TABLE public.sms_history
  ADD COLUMN IF NOT EXISTS rent_payment_id uuid;

CREATE INDEX IF NOT EXISTS idx_sms_history_payment_template
  ON public.sms_history(rent_payment_id, template_key)
  WHERE rent_payment_id IS NOT NULL;