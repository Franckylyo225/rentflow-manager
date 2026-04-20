
-- Buckets : logos passe en privé
UPDATE storage.buckets SET public = false WHERE id = 'logos';

-- Reset complet des politiques storage.objects
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- LOGOS
CREATE POLICY "logos_select_org" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "logos_insert_org_admin" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.is_org_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "logos_update_org_admin" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND public.is_org_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "logos_delete_org_admin" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND public.is_org_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);

-- RECEIPTS
CREATE POLICY "receipts_select_org" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "receipts_insert_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts' AND public.is_gestionnaire_or_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "receipts_update_org" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'receipts' AND public.is_gestionnaire_or_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);
CREATE POLICY "receipts_delete_org" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'receipts' AND public.is_org_admin(auth.uid()) AND (storage.foldername(name))[1] = public.get_user_org_id(auth.uid())::text);

-- PATRIMONY-DOCS (chemin: <asset_id>/...)
CREATE POLICY "patrimony_docs_select_org" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'patrimony-docs' AND EXISTS (
  SELECT 1 FROM public.patrimony_assets pa
  WHERE pa.id::text = (storage.foldername(name))[1]
    AND pa.organization_id = public.get_user_org_id(auth.uid())
));
CREATE POLICY "patrimony_docs_insert_org" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'patrimony-docs' AND public.is_gestionnaire_or_admin(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.patrimony_assets pa
  WHERE pa.id::text = (storage.foldername(name))[1]
    AND pa.organization_id = public.get_user_org_id(auth.uid())
));
CREATE POLICY "patrimony_docs_update_org" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'patrimony-docs' AND public.is_gestionnaire_or_admin(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.patrimony_assets pa
  WHERE pa.id::text = (storage.foldername(name))[1]
    AND pa.organization_id = public.get_user_org_id(auth.uid())
));
CREATE POLICY "patrimony_docs_delete_org" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'patrimony-docs' AND public.is_org_admin(auth.uid()) AND EXISTS (
  SELECT 1 FROM public.patrimony_assets pa
  WHERE pa.id::text = (storage.foldername(name))[1]
    AND pa.organization_id = public.get_user_org_id(auth.uid())
));

-- ===== Durcissement RLS : public -> authenticated =====

-- asset_holders
DROP POLICY IF EXISTS "Admin can delete asset_holders" ON public.asset_holders;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert asset_holders" ON public.asset_holders;
DROP POLICY IF EXISTS "Admin/gestionnaire can update asset_holders" ON public.asset_holders;
DROP POLICY IF EXISTS "Users can view org asset_holders" ON public.asset_holders;
CREATE POLICY "Users can view org asset_holders" ON public.asset_holders FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert asset_holders" ON public.asset_holders FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update asset_holders" ON public.asset_holders FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete asset_holders" ON public.asset_holders FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- bail_terminations
DROP POLICY IF EXISTS "Admin can delete bail_terminations" ON public.bail_terminations;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert bail_terminations" ON public.bail_terminations;
DROP POLICY IF EXISTS "Admin/gestionnaire can update bail_terminations" ON public.bail_terminations;
DROP POLICY IF EXISTS "Users can view org bail_terminations" ON public.bail_terminations;
CREATE POLICY "Users can view org bail_terminations" ON public.bail_terminations FOR SELECT TO authenticated
USING (tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert bail_terminations" ON public.bail_terminations FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can update bail_terminations" ON public.bail_terminations FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete bail_terminations" ON public.bail_terminations FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND tenant_id IN (SELECT t.id FROM public.tenants t JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

-- countries
DROP POLICY IF EXISTS "Admin/gestionnaire can manage countries" ON public.countries;
DROP POLICY IF EXISTS "Users can view org countries" ON public.countries;
CREATE POLICY "Users can view org countries" ON public.countries FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can manage countries" ON public.countries FOR ALL TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- custom_roles
DROP POLICY IF EXISTS "Admin can manage custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Users can view org custom_roles" ON public.custom_roles;
CREATE POLICY "Users can view org custom_roles" ON public.custom_roles FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can manage custom_roles" ON public.custom_roles FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- employees
DROP POLICY IF EXISTS "Admin can delete employees" ON public.employees;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Admin/gestionnaire can update employees" ON public.employees;
DROP POLICY IF EXISTS "Users can view org employees" ON public.employees;
CREATE POLICY "Users can view org employees" ON public.employees FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert employees" ON public.employees FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update employees" ON public.employees FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete employees" ON public.employees FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- escalation_tasks
DROP POLICY IF EXISTS "Admin can delete escalation_tasks" ON public.escalation_tasks;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert escalation_tasks" ON public.escalation_tasks;
DROP POLICY IF EXISTS "Admin/gestionnaire can update escalation_tasks" ON public.escalation_tasks;
DROP POLICY IF EXISTS "Users can view org escalation_tasks" ON public.escalation_tasks;
CREATE POLICY "Users can view org escalation_tasks" ON public.escalation_tasks FOR SELECT TO authenticated
USING (rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id=t.id JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert escalation_tasks" ON public.escalation_tasks FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id=t.id JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can update escalation_tasks" ON public.escalation_tasks FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id=t.id JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete escalation_tasks" ON public.escalation_tasks FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND rent_payment_id IN (SELECT rp.id FROM public.rent_payments rp JOIN public.tenants t ON rp.tenant_id=t.id JOIN public.units u ON t.unit_id=u.id JOIN public.properties p ON u.property_id=p.id WHERE p.organization_id = public.get_user_org_id(auth.uid())));

-- expense_categories
DROP POLICY IF EXISTS "Admin can manage expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users can view org expense_categories" ON public.expense_categories;
CREATE POLICY "Users can view org expense_categories" ON public.expense_categories FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can manage expense_categories" ON public.expense_categories FOR ALL TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()))
WITH CHECK (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- expenses
DROP POLICY IF EXISTS "Admin can delete expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin/gestionnaire can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view org expenses" ON public.expenses;
CREATE POLICY "Users can view org expenses" ON public.expenses FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert expenses" ON public.expenses FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update expenses" ON public.expenses FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete expenses" ON public.expenses FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Org members can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Org members can insert notifications" ON public.notifications FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- patrimony_assets
DROP POLICY IF EXISTS "Admin can delete patrimony_assets" ON public.patrimony_assets;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert patrimony_assets" ON public.patrimony_assets;
DROP POLICY IF EXISTS "Admin/gestionnaire can update patrimony_assets" ON public.patrimony_assets;
DROP POLICY IF EXISTS "Users can view org patrimony_assets" ON public.patrimony_assets;
CREATE POLICY "Users can view org patrimony_assets" ON public.patrimony_assets FOR SELECT TO authenticated
USING (organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can insert patrimony_assets" ON public.patrimony_assets FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin/gestionnaire can update patrimony_assets" ON public.patrimony_assets FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));
CREATE POLICY "Admin can delete patrimony_assets" ON public.patrimony_assets FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND organization_id = public.get_user_org_id(auth.uid()));

-- patrimony_contacts
DROP POLICY IF EXISTS "Admin can delete patrimony_contacts" ON public.patrimony_contacts;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert patrimony_contacts" ON public.patrimony_contacts;
DROP POLICY IF EXISTS "Admin/gestionnaire can update patrimony_contacts" ON public.patrimony_contacts;
DROP POLICY IF EXISTS "Users can view org patrimony_contacts" ON public.patrimony_contacts;
CREATE POLICY "Users can view org patrimony_contacts" ON public.patrimony_contacts FOR SELECT TO authenticated
USING (asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert patrimony_contacts" ON public.patrimony_contacts FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can update patrimony_contacts" ON public.patrimony_contacts FOR UPDATE TO authenticated
USING (public.is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete patrimony_contacts" ON public.patrimony_contacts FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));

-- patrimony_documents
DROP POLICY IF EXISTS "Admin can delete patrimony_documents" ON public.patrimony_documents;
DROP POLICY IF EXISTS "Admin/gestionnaire can insert patrimony_documents" ON public.patrimony_documents;
DROP POLICY IF EXISTS "Users can view org patrimony_documents" ON public.patrimony_documents;
CREATE POLICY "Users can view org patrimony_documents" ON public.patrimony_documents FOR SELECT TO authenticated
USING (asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin/gestionnaire can insert patrimony_documents" ON public.patrimony_documents FOR INSERT TO authenticated
WITH CHECK (public.is_gestionnaire_or_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));
CREATE POLICY "Admin can delete patrimony_documents" ON public.patrimony_documents FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND asset_id IN (SELECT id FROM public.patrimony_assets WHERE organization_id = public.get_user_org_id(auth.uid())));

-- ===== Privilege escalation : restreindre admins à leur org =====
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view org roles" ON public.user_roles;

CREATE POLICY "Users can view org roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admins can insert roles in own org" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(auth.uid()) AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admins can update roles in own org" ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_org_admin(auth.uid()) AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())))
WITH CHECK (public.is_org_admin(auth.uid()) AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())));

CREATE POLICY "Admins can delete roles in own org" ON public.user_roles FOR DELETE TO authenticated
USING (public.is_org_admin(auth.uid()) AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.get_user_org_id(auth.uid())));
