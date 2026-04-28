-- Table d'audit des changements de rôles
CREATE TABLE public.role_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id UUID NOT NULL,
  target_user_name TEXT,
  target_user_email TEXT,
  changed_by_user_id UUID,
  changed_by_name TEXT,
  changed_by_email TEXT,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  old_role TEXT,
  new_role TEXT,
  old_custom_role_id UUID,
  new_custom_role_id UUID,
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_role_change_logs_target ON public.role_change_logs(target_user_id);
CREATE INDEX idx_role_change_logs_created ON public.role_change_logs(created_at DESC);

ALTER TABLE public.role_change_logs ENABLE ROW LEVEL SECURITY;

-- Seul le super admin peut consulter
CREATE POLICY "Super admin can view role logs"
ON public.role_change_logs FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Insertion uniquement via trigger (security definer)
CREATE POLICY "System can insert role logs"
ON public.role_change_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Trigger function
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  actor_profile RECORD;
  target_profile RECORD;
  v_action TEXT;
  v_target_id UUID;
BEGIN
  actor_id := auth.uid();
  v_target_id := COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN v_action := 'created';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS NOT DISTINCT FROM NEW.role
       AND OLD.custom_role_id IS NOT DISTINCT FROM NEW.custom_role_id
       AND OLD.city_ids IS NOT DISTINCT FROM NEW.city_ids THEN
      RETURN NEW;
    END IF;
    v_action := 'updated';
  ELSE v_action := 'deleted';
  END IF;

  SELECT full_name, email, organization_id INTO target_profile
  FROM public.profiles WHERE user_id = v_target_id LIMIT 1;

  IF actor_id IS NOT NULL THEN
    SELECT full_name, email INTO actor_profile
    FROM public.profiles WHERE user_id = actor_id LIMIT 1;
  END IF;

  INSERT INTO public.role_change_logs (
    target_user_id, target_user_name, target_user_email,
    changed_by_user_id, changed_by_name, changed_by_email,
    action, old_role, new_role, old_custom_role_id, new_custom_role_id,
    organization_id
  ) VALUES (
    v_target_id, target_profile.full_name, target_profile.email,
    actor_id, actor_profile.full_name, actor_profile.email,
    v_action,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.role::TEXT END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.role::TEXT END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.custom_role_id END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.custom_role_id END,
    target_profile.organization_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();