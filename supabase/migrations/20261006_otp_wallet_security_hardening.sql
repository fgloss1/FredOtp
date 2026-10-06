-- NAVA OTP security hardening for public launch.
-- Makes wallet markers compatible with the OTP debit/refund RPC and
-- closes/refunds an OTP order atomically with authenticated ownership.
BEGIN;

CREATE OR REPLACE FUNCTION public.protect_profile_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $nava$
DECLARE
  v_operation TEXT;
BEGIN
  v_operation := COALESCE(current_setting('nava.wallet_operation', true), '');

  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Profile role may only be changed by the NAVA server';
  END IF;

  IF NEW.balance IS DISTINCT FROM OLD.balance THEN
    IF COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin_user()
       AND v_operation NOT IN (
         'complete_deposit_atomic',
         'admin_complete_deposit_atomic',
         'admin_crypto_recovery',
         'otp_purchase',
         'otp_refund'
       ) THEN
      RAISE EXCEPTION 'Profile balance may only be changed by NAVA server wallet operations';
    END IF;
  END IF;

  RETURN NEW;
END;
$nava$;

CREATE OR REPLACE FUNCTION public.otp_close_order_atomic(
  p_order_id UUID,
  p_user_id UUID,
  p_final_status TEXT
)
RETURNS TABLE(
  status TEXT,
  refunded_amount NUMERIC,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $nava$
DECLARE
  v_order_user_id UUID;
  v_order_status TEXT;
  v_refund NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Server-side order operation required';
  END IF;

  IF p_order_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'Order and user are required';
  END IF;

  IF p_final_status NOT IN ('canceled', 'expired') THEN
    RAISE EXCEPTION 'Invalid OTP closing status';
  END IF;

  SELECT user_id, status, COALESCE(price_usd, 0)
    INTO v_order_user_id, v_order_status, v_refund
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Order does not belong to authenticated user';
  END IF;

  IF LOWER(COALESCE(v_order_status, '')) IN ('canceled', 'refunded', 'completed', 'expired', 'banned') THEN
    SELECT COALESCE(balance, 0)
      INTO v_new_balance
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN QUERY SELECT v_order_status, 0::NUMERIC, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;

  IF LOWER(COALESCE(v_order_status, '')) <> 'pending'
     AND POSITION('waiting' IN LOWER(COALESCE(v_order_status, ''))) = 0 THEN
    RAISE EXCEPTION 'Order is not eligible for cancellation or expiry';
  END IF;

  PERFORM set_config('nava.wallet_operation', 'otp_refund', true);

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_refund
  WHERE id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  UPDATE public.orders
  SET status = p_final_status
  WHERE id = p_order_id;

  RETURN QUERY SELECT p_final_status, v_refund, v_new_balance;
END;
$nava$;

REVOKE ALL ON FUNCTION public.otp_close_order_atomic(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.otp_close_order_atomic(UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.otp_close_order_atomic(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.otp_close_order_atomic(UUID, UUID, TEXT) TO service_role;

COMMIT;