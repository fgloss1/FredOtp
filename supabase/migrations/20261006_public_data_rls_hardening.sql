-- NAVA public-data RLS hardening.
-- Customers can read only their own profile/orders.
-- Administrators retain the existing admin-desk access.
-- Financial mutations remain server-side except the existing admin manual-credit UI.
BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.transactions FROM anon, authenticated;

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT ON TABLE public.transactions TO authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.transactions TO service_role;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = id
  OR (select public.is_admin_user())
);

DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update
ON public.profiles
FOR UPDATE
TO authenticated
USING ((select public.is_admin_user()))
WITH CHECK ((select public.is_admin_user()));

DROP POLICY IF EXISTS orders_select_own_or_admin ON public.orders;
CREATE POLICY orders_select_own_or_admin
ON public.orders
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = user_id
  OR (select public.is_admin_user())
);

DROP POLICY IF EXISTS transactions_admin_select ON public.transactions;
CREATE POLICY transactions_admin_select
ON public.transactions
FOR SELECT
TO authenticated
USING ((select public.is_admin_user()));

DROP POLICY IF EXISTS transactions_admin_insert ON public.transactions;
CREATE POLICY transactions_admin_insert
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK ((select public.is_admin_user()));

COMMIT;
