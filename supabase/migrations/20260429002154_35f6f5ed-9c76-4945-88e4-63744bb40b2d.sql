-- Supprime l'ancien bail clôturé "LES RESIDENCES BYOMA" (inactif depuis moins de 4 jours)
-- ainsi que ses données rattachées (loyers, paiements, escalades, fin de bail).
DELETE FROM public.payment_records
WHERE rent_payment_id IN (
  SELECT id FROM public.rent_payments WHERE tenant_id = 'd210afb1-c2d1-465b-94d6-01a1c1c52d68'
);

DELETE FROM public.escalation_tasks
WHERE rent_payment_id IN (
  SELECT id FROM public.rent_payments WHERE tenant_id = 'd210afb1-c2d1-465b-94d6-01a1c1c52d68'
);

DELETE FROM public.rent_payments WHERE tenant_id = 'd210afb1-c2d1-465b-94d6-01a1c1c52d68';

DELETE FROM public.bail_terminations WHERE tenant_id = 'd210afb1-c2d1-465b-94d6-01a1c1c52d68';

DELETE FROM public.tenants WHERE id = 'd210afb1-c2d1-465b-94d6-01a1c1c52d68';