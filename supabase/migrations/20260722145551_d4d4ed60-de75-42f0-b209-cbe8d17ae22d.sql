
-- Wipe all demo data for a clean slate
DELETE FROM public.admin_audit_log;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.products;
DELETE FROM public.certificates;
DELETE FROM public.consulting_requests;
DELETE FROM public.diagnoses;
DELETE FROM public.garden_events;
DELETE FROM public.plots;
DELETE FROM public.gardens;
DELETE FROM public.wallet_transactions;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;
