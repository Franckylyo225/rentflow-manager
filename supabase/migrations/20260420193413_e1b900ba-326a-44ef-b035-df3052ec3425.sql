-- 1. Ajout des colonnes de configuration auto-send
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS auto_sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sms_hour integer NOT NULL DEFAULT 8;

-- 2. Reset des données métier (ordre important pour les FK logiques)
DELETE FROM public.notifications;
DELETE FROM public.sms_history;
DELETE FROM public.escalation_tasks;
DELETE FROM public.payment_records;
DELETE FROM public.rent_payments;
DELETE FROM public.bail_terminations;
DELETE FROM public.tenants;
DELETE FROM public.units;
DELETE FROM public.expenses;
DELETE FROM public.employees;
DELETE FROM public.properties;
DELETE FROM public.patrimony_documents;
DELETE FROM public.patrimony_contacts;
DELETE FROM public.patrimony_assets;
DELETE FROM public.asset_holders;