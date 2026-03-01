
-- 1. Create countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org countries" ON public.countries
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can manage countries" ON public.countries
  FOR ALL USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- 2. Add country_id to cities table (nullable for backward compat)
ALTER TABLE public.cities ADD COLUMN country_id UUID REFERENCES public.countries(id);

-- 3. Add type column to properties table
ALTER TABLE public.properties ADD COLUMN type TEXT NOT NULL DEFAULT 'immeuble';
