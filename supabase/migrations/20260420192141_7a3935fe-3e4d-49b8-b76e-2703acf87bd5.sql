ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS monsms_company_id text,
  ADD COLUMN IF NOT EXISTS monsms_api_key text,
  ADD COLUMN IF NOT EXISTS monsms_sender_id text;