
-- Expense categories
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org expense_categories" ON public.expense_categories
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin can manage expense_categories" ON public.expense_categories
  FOR ALL USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

-- Expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  property_id UUID REFERENCES public.properties(id),
  city_id UUID REFERENCES public.cities(id),
  country_id UUID REFERENCES public.countries(id),
  amount BIGINT NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT DEFAULT '',
  expense_type TEXT NOT NULL DEFAULT 'variable', -- 'fixe' or 'variable'
  frequency TEXT NOT NULL DEFAULT 'unique', -- 'unique','mensuelle','trimestrielle','annuelle'
  receipt_url TEXT,
  employee_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org expenses" ON public.expenses
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update expenses" ON public.expenses
  FOR UPDATE USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete expenses" ON public.expenses
  FOR DELETE USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employees (salaries)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  full_name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT '',
  monthly_salary BIGINT NOT NULL DEFAULT 0,
  city_id UUID REFERENCES public.cities(id),
  property_id UUID REFERENCES public.properties(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org employees" ON public.employees
  FOR SELECT USING (organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert employees" ON public.employees
  FOR INSERT WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update employees" ON public.employees
  FOR UPDATE USING (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete employees" ON public.employees
  FOR DELETE USING (is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key for expenses.employee_id
ALTER TABLE public.expenses ADD CONSTRAINT expenses_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Add default categories on new user signup: update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon entreprise'),
    NEW.email
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (user_id, organization_id, full_name, email)
  VALUES (NEW.id, new_org_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');

  INSERT INTO public.cities (name, organization_id) VALUES
    ('Abidjan', new_org_id), ('Bouaké', new_org_id), ('Yamoussoukro', new_org_id),
    ('San-Pédro', new_org_id), ('Daloa', new_org_id), ('Korhogo', new_org_id);

  INSERT INTO public.notification_templates (organization_id, template_key, label, sms_content, email_content) VALUES
    (new_org_id, 'before_5', 'Rappel J-5', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est dû le {{date_echeance}}.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_1', 'Relance J+1', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA était dû hier.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA était dû le {{date_echeance}}.\n\nCordialement'),
    (new_org_id, 'after_7', 'Relance J+7', 'Bonjour {{nom}}, votre loyer de {{montant}} FCFA est en retard de 7 jours.', 'Bonjour {{nom}},\n\nVotre loyer de {{montant}} FCFA est en retard de 7 jours.\n\nCordialement');

  -- Default expense categories
  INSERT INTO public.expense_categories (organization_id, name, is_default) VALUES
    (new_org_id, 'Maintenance', true),
    (new_org_id, 'Réparations', true),
    (new_org_id, 'Sécurité', true),
    (new_org_id, 'Nettoyage', true),
    (new_org_id, 'Salaires personnel', true),
    (new_org_id, 'Électricité / Eau', true),
    (new_org_id, 'Taxes', true),
    (new_org_id, 'Assurance', true),
    (new_org_id, 'Autres', true);

  RETURN NEW;
END;
$function$;

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);
