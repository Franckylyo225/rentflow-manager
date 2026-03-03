
ALTER TABLE public.tenants 
  ADD COLUMN tenant_type text NOT NULL DEFAULT 'individual',
  ADD COLUMN company_name text NULL,
  ADD COLUMN contact_person text NULL,
  ADD COLUMN rccm text NULL;
