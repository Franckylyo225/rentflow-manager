
-- 1) PROFILES: prevent users from changing their own organization_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND organization_id = public.get_user_org_id(auth.uid())
);

-- INSERT policy: limit to own user_id AND require organization_id matches existing profile (or none yet — handled by handle_new_user trigger which is SECURITY DEFINER and bypasses RLS)
DROP POLICY IF EXISTS "System can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND organization_id = public.get_user_org_id(auth.uid())
);

-- 2) PAYMENT_RECORDS: add DELETE policy for admins
CREATE POLICY "Admin can delete payment_records"
ON public.payment_records
FOR DELETE
TO authenticated
USING (
  public.is_org_admin(auth.uid())
  AND rent_payment_id IN (
    SELECT rp.id FROM public.rent_payments rp
    JOIN public.tenants t ON rp.tenant_id = t.id
    JOIN public.units u ON t.unit_id = u.id
    JOIN public.properties p ON u.property_id = p.id
    WHERE p.organization_id = public.get_user_org_id(auth.uid())
  )
);

-- 3) ORGANIZATIONS: hide sensitive columns from non-admin members via column-level GRANTs.
-- Revoke broad SELECT and re-grant only safe columns to authenticated. Admins use a SECURITY DEFINER RPC to read sensitive ones.
REVOKE SELECT ON public.organizations FROM authenticated;
GRANT SELECT (
  id, name, email, phone, address, created_at, updated_at, logo_url,
  currency, date_format, timezone, legal_name, legal_id, legal_address,
  late_fee_enabled, late_fee_type, late_fee_value, late_fee_grace_days,
  accepted_payment_methods, fiscal_year_start, rent_due_day, deposit_months,
  salaries_enabled, sms_sender_name, sms_sender_number,
  auto_sms_enabled, auto_sms_hour
) ON public.organizations TO authenticated;

-- Admins keep full UPDATE (already restricted by policy). Make sure UPDATE grant remains for all sensitive cols.
GRANT UPDATE ON public.organizations TO authenticated;

-- Helper function for admins to read sensitive credentials
CREATE OR REPLACE FUNCTION public.get_org_sensitive_settings()
RETURNS TABLE (
  invite_token text,
  monsms_api_key text,
  monsms_company_id text,
  monsms_sender_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.invite_token, o.monsms_api_key, o.monsms_company_id, o.monsms_sender_id
  FROM public.organizations o
  WHERE o.id = public.get_user_org_id(auth.uid())
    AND public.is_org_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_org_sensitive_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_sensitive_settings() TO authenticated;
