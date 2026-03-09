
-- Allow admins to update profiles in their org (for approving users)
CREATE POLICY "Admin can update org profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid())
)
WITH CHECK (
  is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid())
);

-- Allow admins to delete profiles in their org (for rejecting users)
CREATE POLICY "Admin can delete org profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  is_org_admin(auth.uid()) AND organization_id = get_user_org_id(auth.uid())
);
