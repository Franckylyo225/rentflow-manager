-- Permettre aux super_admin de gérer les données comme admin/gestionnaire
CREATE OR REPLACE FUNCTION public.is_gestionnaire_or_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'gestionnaire')
      OR public.has_role(_user_id, 'super_admin')
$function$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'super_admin')
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_payments(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin')
      OR public.has_role(_user_id, 'gestionnaire')
      OR public.has_role(_user_id, 'comptable')
      OR public.has_role(_user_id, 'super_admin')
$function$;