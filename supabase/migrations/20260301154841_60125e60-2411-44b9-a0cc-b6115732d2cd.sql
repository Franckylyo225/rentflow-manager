
-- Table for tracking lease terminations
CREATE TABLE public.bail_terminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  reason TEXT NOT NULL CHECK (reason IN ('normal', 'anticipee_locataire', 'anticipee_proprietaire', 'impaye')),
  notification_date DATE NOT NULL,
  notice_duration INTEGER NOT NULL DEFAULT 1,
  effective_date DATE NOT NULL,
  -- Financial summary
  remaining_rent_due BIGINT NOT NULL DEFAULT 0,
  pending_charges BIGINT NOT NULL DEFAULT 0,
  penalties BIGINT NOT NULL DEFAULT 0,
  deposit_amount BIGINT NOT NULL DEFAULT 0,
  prorata_adjustment BIGINT NOT NULL DEFAULT 0,
  total_due BIGINT NOT NULL DEFAULT 0,
  deposit_retained BIGINT NOT NULL DEFAULT 0,
  balance BIGINT NOT NULL DEFAULT 0,
  -- Inspection (for future phase)
  inspection_status TEXT,
  inspection_notes TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending_inspection', 'closed')),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bail_terminations ENABLE ROW LEVEL SECURITY;

-- RLS policies (same org access pattern via tenant -> unit -> property)
CREATE POLICY "Users can view org bail_terminations"
ON public.bail_terminations FOR SELECT
USING (tenant_id IN (
  SELECT t.id FROM tenants t
  JOIN units u ON t.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE p.organization_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Admin/gestionnaire can insert bail_terminations"
ON public.bail_terminations FOR INSERT
WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (
  SELECT t.id FROM tenants t
  JOIN units u ON t.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE p.organization_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Admin/gestionnaire can update bail_terminations"
ON public.bail_terminations FOR UPDATE
USING (is_gestionnaire_or_admin(auth.uid()) AND tenant_id IN (
  SELECT t.id FROM tenants t
  JOIN units u ON t.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE p.organization_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Admin can delete bail_terminations"
ON public.bail_terminations FOR DELETE
USING (is_org_admin(auth.uid()) AND tenant_id IN (
  SELECT t.id FROM tenants t
  JOIN units u ON t.unit_id = u.id
  JOIN properties p ON u.property_id = p.id
  WHERE p.organization_id = get_user_org_id(auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_bail_terminations_updated_at
BEFORE UPDATE ON public.bail_terminations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
