
-- Add settings columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'FCFA',
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Abidjan',
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS legal_id text,
  ADD COLUMN IF NOT EXISTS legal_address text,
  ADD COLUMN IF NOT EXISTS late_fee_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_fee_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS late_fee_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_fee_grace_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_payment_methods text[] NOT NULL DEFAULT ARRAY['Espèces', 'Virement', 'Mobile Money', 'Chèque'],
  ADD COLUMN IF NOT EXISTS fiscal_year_start integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS deposit_months integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS rent_due_day integer NOT NULL DEFAULT 5;

-- Allow admin to update organizations
CREATE POLICY "Admin can update own org"
  ON public.organizations
  FOR UPDATE
  USING (is_org_admin(auth.uid()) AND id = get_user_org_id(auth.uid()))
  WITH CHECK (is_org_admin(auth.uid()) AND id = get_user_org_id(auth.uid()));
