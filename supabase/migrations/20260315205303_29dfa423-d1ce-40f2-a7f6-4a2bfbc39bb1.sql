
CREATE TABLE public.sms_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT DEFAULT '',
  message TEXT NOT NULL,
  sender_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  orange_message_id TEXT,
  template_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org sms_history" ON public.sms_history
  FOR SELECT TO authenticated
  USING (organization_id = get_user_org_id(auth.uid()));

CREATE POLICY "Admin/gestionnaire can insert sms_history" ON public.sms_history
  FOR INSERT TO authenticated
  WITH CHECK (is_gestionnaire_or_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid()));

CREATE INDEX idx_sms_history_org ON public.sms_history(organization_id);
CREATE INDEX idx_sms_history_created ON public.sms_history(created_at DESC);
