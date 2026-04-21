-- Add sale columns to patrimony_assets
ALTER TABLE public.patrimony_assets
  ADD COLUMN IF NOT EXISTS sale_price BIGINT,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS buyer_name TEXT,
  ADD COLUMN IF NOT EXISTS notary_name TEXT,
  ADD COLUMN IF NOT EXISTS sale_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS sale_commission BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_deed_url TEXT;

-- Create private storage bucket for sale deeds
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrimony-sales', 'patrimony-sales', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for patrimony-sales bucket (folder = organization_id)
CREATE POLICY "Org members can view patrimony-sales"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patrimony-sales'
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Admin/gestionnaire can upload patrimony-sales"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patrimony-sales'
  AND public.is_gestionnaire_or_admin(auth.uid())
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

CREATE POLICY "Admin/gestionnaire can delete patrimony-sales"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patrimony-sales'
  AND public.is_gestionnaire_or_admin(auth.uid())
  AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text
);

-- Add the 'Vente de patrimoine' expense_categories entry as a revenue marker
-- (existing category model is reused, but we add a flag-like name to make filtering easy)
INSERT INTO public.expense_categories (organization_id, name, is_default)
SELECT id, 'Vente de patrimoine', true
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec
  WHERE ec.organization_id = o.id AND ec.name = 'Vente de patrimoine'
);

-- Update handle_new_user trigger to include the new category for future orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
  invite TEXT;
  existing_org_id UUID;
BEGIN
  invite := NEW.raw_user_meta_data->>'invite_token';

  IF invite IS NOT NULL AND invite != '' THEN
    SELECT id INTO existing_org_id FROM public.organizations WHERE invite_token = invite LIMIT 1;
    IF existing_org_id IS NULL THEN
      RAISE EXCEPTION 'Invalid invitation token';
    END IF;
    INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
    VALUES (NEW.id, existing_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, false);
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'gestionnaire');
    RETURN NEW;
  END IF;

  INSERT INTO public.organizations (name, email)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'), NEW.email)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email, is_approved)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id), ('Bouaké', new_org_id), ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id), ('Daloa', new_org_id), ('Korhogo', new_org_id);

  INSERT INTO public.notification_templates (organization_id, template_key, label, sms_content, email_content) VALUES
    (new_org_id, 'before_5', 'Rappel J-5', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est dû le {{date_echeance}}.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_1', 'Relance J+1', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA était dû hier.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA était dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_7', 'Relance J+7', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est en retard de 7 jours.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est en retard de 7 jours.\n\nCordialement');

  INSERT INTO public.expense_categories (organization_id, name, is_default) VALUES
    (new_org_id, 'Maintenance', true),
    (new_org_id, 'Réparations', true),
    (new_org_id, 'Sécurité', true),
    (new_org_id, 'Nettoyage', true),
    (new_org_id, 'Salaires personnel', true),
    (new_org_id, 'Électricité / Eau', true),
    (new_org_id, 'Taxes', true),
    (new_org_id, 'Assurance', true),
    (new_org_id, 'Vente de patrimoine', true),
    (new_org_id, 'Autres', true);

  INSERT INTO public.custom_roles (organization_id, name, base_role, permissions, is_system) VALUES
    (new_org_id, 'Administrateur', 'admin', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports','edit_settings','manage_users'], true),
    (new_org_id, 'Gestionnaire', 'gestionnaire', ARRAY['view_dashboard','view_properties','edit_properties','view_tenants','edit_tenants','view_rents','edit_rents','view_expenses','edit_expenses','access_litigation','view_reports'], true),
    (new_org_id, 'Comptable', 'comptable', ARRAY['view_dashboard','view_rents','view_expenses','view_reports'], true);

  RETURN NEW;
END;
$function$;