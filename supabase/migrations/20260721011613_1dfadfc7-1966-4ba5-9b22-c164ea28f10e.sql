
-- 1. Roles system
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Bootstrap: allow claiming admin only when no admin exists yet (demo mode)
CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_any boolean; uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') INTO has_any;
  IF has_any THEN RETURN public.has_role(uid,'admin'); END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid,'admin') ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;

-- 2. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins read audit" ON public.admin_audit_log;
CREATE POLICY "admins read audit" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 3. Referential integrity: cascade delete of a farmer removes all their data
DO $$ BEGIN
  BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_auth_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.gardens ADD CONSTRAINT gardens_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.plots ADD CONSTRAINT plots_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.garden_events ADD CONSTRAINT garden_events_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.diagnoses ADD CONSTRAINT diagnoses_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_tx_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.consulting_requests ADD CONSTRAINT consulting_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_auth_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_auth_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN ALTER TABLE public.products ADD CONSTRAINT products_seller_auth_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END;
END $$;

-- 4. Water reminder helper: last watered per plot
CREATE OR REPLACE VIEW public.plot_last_watered AS
SELECT p.id AS plot_id, p.user_id, p.garden_id, p.crop, p.status, p.planted_on,
  (SELECT MAX(occurred_at) FROM public.garden_events e WHERE e.plot_id = p.id AND e.kind='watered') AS last_watered_at
FROM public.plots p;
GRANT SELECT ON public.plot_last_watered TO authenticated;
