
-- Restrict buyer access on orders: allow viewing and creating own orders only.
DROP POLICY IF EXISTS "own orders" ON public.orders;
CREATE POLICY "own orders select" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
-- No UPDATE/DELETE policy: only service_role can modify orders (status/total_cents).

-- Remove signed-in access to bootstrap admin claim function; only service_role/postgres may execute.
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_none() FROM PUBLIC, authenticated;
