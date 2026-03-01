
-- ============================================================
-- RENTFLOW DATABASE SCHEMA
-- Multi-tenant property management for Ivory Coast
-- ============================================================

-- 1. ENUM TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'gestionnaire', 'comptable');
CREATE TYPE public.unit_status AS ENUM ('occupied', 'vacant');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partial', 'late');

-- 2. BASE TABLES

-- Organizations (multi-tenant)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User roles (separate table as required)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'gestionnaire',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Units
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rent BIGINT NOT NULL DEFAULT 0,
  charges BIGINT NOT NULL DEFAULT 0,
  status unit_status NOT NULL DEFAULT 'vacant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  id_number TEXT DEFAULT '',
  lease_start DATE NOT NULL DEFAULT CURRENT_DATE,
  lease_duration INTEGER NOT NULL DEFAULT 12,
  rent BIGINT NOT NULL DEFAULT 0,
  deposit BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rent payments (monthly dues)
CREATE TABLE public.rent_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL DEFAULT 0,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment records (individual payments)
CREATE TABLE public.payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rent_payment_id UUID NOT NULL REFERENCES public.rent_payments(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT NOT NULL DEFAULT 'Espèces',
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification templates
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_content TEXT NOT NULL DEFAULT '',
  email_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_key)
);

-- 3. INDEXES
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_cities_org_id ON public.cities(organization_id);
CREATE INDEX idx_properties_org_id ON public.properties(organization_id);
CREATE INDEX idx_properties_city_id ON public.properties(city_id);
CREATE INDEX idx_units_property_id ON public.units(property_id);
CREATE INDEX idx_tenants_unit_id ON public.tenants(unit_id);
CREATE INDEX idx_rent_payments_tenant_id ON public.rent_payments(tenant_id);
CREATE INDEX idx_payment_records_rent_payment_id ON public.payment_records(rent_payment_id);

-- 4. SECURITY DEFINER FUNCTIONS

-- Get user's organization id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Check if user is gestionnaire or admin
CREATE OR REPLACE FUNCTION public.is_gestionnaire_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'gestionnaire')
$$;

-- Check if user can manage payments (comptable, gestionnaire, or admin)
CREATE OR REPLACE FUNCTION public.can_manage_payments(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') 
    OR public.has_role(_user_id, 'gestionnaire')
    OR public.has_role(_user_id, 'comptable')
$$;

-- 5. ENABLE RLS ON ALL TABLES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- Organizations: users can see their own org
CREATE POLICY "Users can view own org" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_org_id(auth.uid()));

-- Profiles: users can see profiles in their org
CREATE POLICY "Users can view org profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles: users can see roles in their org
CREATE POLICY "Users can view org roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid()));

-- Cities: users can see their org's cities
CREATE POLICY "Users can view org cities" ON public.cities
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can manage cities" ON public.cities
  FOR ALL TO authenticated
  USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- Properties: org-scoped
CREATE POLICY "Users can view org properties" ON public.properties
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can insert properties" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can update properties" ON public.properties
  FOR UPDATE TO authenticated
  USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin can delete properties" ON public.properties
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- Units: via property org
CREATE POLICY "Users can view org units" ON public.units
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT id FROM public.properties WHERE organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can insert units" ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND property_id IN (SELECT id FROM public.properties WHERE organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can update units" ON public.units
  FOR UPDATE TO authenticated
  USING (public.is_gestionnaire_or_admin(auth.uid()) AND property_id IN (SELECT id FROM public.properties WHERE organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin can delete units" ON public.units
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid()) AND property_id IN (SELECT id FROM public.properties WHERE organization_id = public.get_user_org_id(auth.uid())));

-- Tenants: via unit -> property -> org
CREATE POLICY "Users can view org tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (unit_id IN (SELECT u.id FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND unit_id IN (SELECT u.id FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can update tenants" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_gestionnaire_or_admin(auth.uid()) AND unit_id IN (SELECT u.id FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin can delete tenants" ON public.tenants
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid()) AND unit_id IN (SELECT u.id FROM public.units u JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

-- Rent payments: via tenant -> unit -> property -> org
CREATE POLICY "Users can view org rent_payments" ON public.rent_payments
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can insert rent_payments" ON public.rent_payments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin/gestionnaire can update rent_payments" ON public.rent_payments
  FOR UPDATE TO authenticated
  USING (public.can_manage_payments(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admin can delete rent_payments" ON public.rent_payments
  FOR DELETE TO authenticated
  USING (public.is_org_admin(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

-- Payment records
CREATE POLICY "Users can view org payment_records" ON public.payment_records
  FOR SELECT TO authenticated
  USING (rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id = t.id JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Payment managers can insert payment_records" ON public.payment_records
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_payments(auth.uid()) AND rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id = t.id JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Payment managers can update payment_records" ON public.payment_records
  FOR UPDATE TO authenticated
  USING (public.can_manage_payments(auth.uid()) AND rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id = t.id JOIN public.units u ON t.unit_id = u.id JOIN public.properties p ON u.property_id = p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

-- Notification templates: org-scoped, admin only for write
CREATE POLICY "Users can view org notification_templates" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Admin can manage notification_templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- 7. TRIGGERS

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rent_payments_updated_at BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. AUTO-CREATE PROFILE + ORG ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for the user
  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, organization_id, full_name, email)
  VALUES (
    NEW.id,
    new_org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  -- Create default cities for Ivory Coast
  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id),
    ('Bouaké', new_org_id),
    ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id),
    ('Daloa', new_org_id),
    ('Korhogo', new_org_id);

  -- Create default notification templates
  INSERT INTO public.notification_templates (organization_id, template_key, label, sms_content, email_content) VALUES
    (new_org_id, 'before_5', 'Rappel J-5', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est dû le {{date_echeance}}.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_1', 'Relance J+1', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA était dû hier.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA était dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_7', 'Relance J+7', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est en retard de 7 jours.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est en retard de 7 jours.\n\nCordialement');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
