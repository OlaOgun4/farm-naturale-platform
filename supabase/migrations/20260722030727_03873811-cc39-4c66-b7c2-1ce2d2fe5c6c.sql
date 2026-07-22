
-- Consolidate foreign keys to a single ON DELETE CASCADE ON UPDATE CASCADE per relationship

-- profiles → auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_auth_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- gardens → auth.users
ALTER TABLE public.gardens DROP CONSTRAINT IF EXISTS gardens_user_id_fkey;
ALTER TABLE public.gardens DROP CONSTRAINT IF EXISTS gardens_user_auth_fkey;
ALTER TABLE public.gardens ADD CONSTRAINT gardens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- plots → auth.users + plots → gardens
ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_user_id_fkey;
ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_user_auth_fkey;
ALTER TABLE public.plots ADD CONSTRAINT plots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.plots DROP CONSTRAINT IF EXISTS plots_garden_id_fkey;
ALTER TABLE public.plots ADD CONSTRAINT plots_garden_id_fkey FOREIGN KEY (garden_id) REFERENCES public.gardens(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- garden_events → plots + auth.users
ALTER TABLE public.garden_events DROP CONSTRAINT IF EXISTS garden_events_user_id_fkey;
ALTER TABLE public.garden_events DROP CONSTRAINT IF EXISTS garden_events_user_auth_fkey;
ALTER TABLE public.garden_events ADD CONSTRAINT garden_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.garden_events DROP CONSTRAINT IF EXISTS garden_events_plot_id_fkey;
ALTER TABLE public.garden_events ADD CONSTRAINT garden_events_plot_id_fkey FOREIGN KEY (plot_id) REFERENCES public.plots(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- diagnoses → auth.users
ALTER TABLE public.diagnoses DROP CONSTRAINT IF EXISTS diagnoses_user_id_fkey;
ALTER TABLE public.diagnoses DROP CONSTRAINT IF EXISTS diagnoses_user_auth_fkey;
ALTER TABLE public.diagnoses ADD CONSTRAINT diagnoses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- consulting_requests → auth.users
ALTER TABLE public.consulting_requests DROP CONSTRAINT IF EXISTS consulting_requests_user_id_fkey;
ALTER TABLE public.consulting_requests DROP CONSTRAINT IF EXISTS consulting_user_auth_fkey;
ALTER TABLE public.consulting_requests ADD CONSTRAINT consulting_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- wallet_transactions → auth.users
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_user_id_fkey;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_tx_user_auth_fkey;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- orders → auth.users
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_auth_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- order_items → orders + products
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- products → auth.users (seller). Keep SET NULL so historical order_items still reference the product after seller leaves.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_seller_auth_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- certificates → auth.users + learning_modules
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_user_auth_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE public.certificates DROP CONSTRAINT IF EXISTS certificates_module_id_fkey;
ALTER TABLE public.certificates ADD CONSTRAINT certificates_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.learning_modules(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- user_roles → auth.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
