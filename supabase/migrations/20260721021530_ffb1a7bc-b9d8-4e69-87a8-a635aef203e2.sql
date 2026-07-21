
-- Rewrite the admin_audit_log read policy to check user_roles directly.
DROP POLICY IF EXISTS "admins read audit" ON public.admin_audit_log;
CREATE POLICY "admins read audit" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  ));

-- Revoke signed-in execute on has_role SECURITY DEFINER function.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, authenticated;
