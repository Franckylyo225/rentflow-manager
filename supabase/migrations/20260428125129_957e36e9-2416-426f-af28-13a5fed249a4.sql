CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  actor_name TEXT;
  actor_email TEXT;
  target_name TEXT;
  target_email TEXT;
  target_org UUID;
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

  SELECT full_name, email, organization_id
    INTO target_name, target_email, target_org
  FROM public.profiles WHERE user_id = v_target_id LIMIT 1;

  IF actor_id IS NOT NULL THEN
    SELECT full_name, email INTO actor_name, actor_email
    FROM public.profiles WHERE user_id = actor_id LIMIT 1;
  END IF;

  INSERT INTO public.role_change_logs (
    target_user_id, target_user_name, target_user_email,
    changed_by_user_id, changed_by_name, changed_by_email,
    action, old_role, new_role, old_custom_role_id, new_custom_role_id,
    organization_id
  ) VALUES (
    v_target_id, target_name, target_email,
    actor_id, actor_name, actor_email,
    v_action,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.role::TEXT END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.role::TEXT END,
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.custom_role_id END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.custom_role_id END,
    target_org
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;