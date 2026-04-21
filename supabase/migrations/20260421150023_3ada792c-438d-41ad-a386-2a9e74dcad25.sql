-- Add SMS 2FA fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_2fa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_2fa_phone TEXT;

-- Table to store temporary SMS 2FA codes
CREATE TABLE IF NOT EXISTS public.sms_2fa_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_2fa_codes_user ON public.sms_2fa_codes(user_id, created_at DESC);

ALTER TABLE public.sms_2fa_codes ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own codes (edge functions use service role and bypass RLS)
CREATE POLICY "Users can view own 2fa codes"
  ON public.sms_2fa_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own 2fa codes"
  ON public.sms_2fa_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own 2fa codes"
  ON public.sms_2fa_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());