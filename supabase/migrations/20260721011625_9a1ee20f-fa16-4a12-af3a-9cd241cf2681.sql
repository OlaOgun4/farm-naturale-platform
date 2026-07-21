
ALTER VIEW public.plot_last_watered SET (security_invoker = true);
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
