-- 2. Add is_active column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 3. Security definer function to check super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- 4. RLS policies: Super admin can manage everything across all orgs

-- profiles: super admin can view/update/delete any profile
CREATE POLICY "Super admin can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete all profiles"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- user_roles: super admin can manage all roles
CREATE POLICY "Super admin can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can insert all roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update all roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can delete all roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- organizations: super admin can view all orgs
CREATE POLICY "Super admin can view all orgs"
ON public.organizations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 5. Assign super_admin role to basileehile@gmail.com
UPDATE public.user_roles
SET role = 'super_admin'
WHERE user_id = 'ecd5da20-f0b8-4b73-88d1-6d63e777ab08';