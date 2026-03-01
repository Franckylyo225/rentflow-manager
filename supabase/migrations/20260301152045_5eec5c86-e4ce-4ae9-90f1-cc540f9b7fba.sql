
-- Table for internal escalation tasks (follow-up actions)
CREATE TABLE public.escalation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rent_payment_id UUID NOT NULL REFERENCES public.rent_payments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  escalation_level INTEGER NOT NULL DEFAULT 1, -- 1=léger, 2=important, 3=critique
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, done, cancelled
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.escalation_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: users can view tasks for their org's rent payments
CREATE POLICY "Users can view org escalation_tasks"
ON public.escalation_tasks FOR SELECT
USING (
  rent_payment_id IN (
    SELECT rp.id FROM rent_payments rp
    JOIN tenants t ON rp.tenant_id = t.id
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

-- Admin/gestionnaire can insert
CREATE POLICY "Admin/gestionnaire can insert escalation_tasks"
ON public.escalation_tasks FOR INSERT
WITH CHECK (
  is_gestionnaire_or_admin(auth.uid()) AND
  rent_payment_id IN (
    SELECT rp.id FROM rent_payments rp
    JOIN tenants t ON rp.tenant_id = t.id
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

-- Admin/gestionnaire can update
CREATE POLICY "Admin/gestionnaire can update escalation_tasks"
ON public.escalation_tasks FOR UPDATE
USING (
  is_gestionnaire_or_admin(auth.uid()) AND
  rent_payment_id IN (
    SELECT rp.id FROM rent_payments rp
    JOIN tenants t ON rp.tenant_id = t.id
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

-- Admin can delete
CREATE POLICY "Admin can delete escalation_tasks"
ON public.escalation_tasks FOR DELETE
USING (
  is_org_admin(auth.uid()) AND
  rent_payment_id IN (
    SELECT rp.id FROM rent_payments rp
    JOIN tenants t ON rp.tenant_id = t.id
    JOIN units u ON t.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE p.organization_id = get_user_org_id(auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_escalation_tasks_updated_at
BEFORE UPDATE ON public.escalation_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
