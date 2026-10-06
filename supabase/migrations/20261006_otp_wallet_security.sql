-- Secure OTP wallet debit/refund primitives for the Supabase profiles wallet.
-- Server-only: executable by service_role only.
BEGIN;

CREATE OR REPLACE FUNCTION public.otp_balance_adjust_atomic(
  p_user_id UUID,
  p_delta NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $nava$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Server-side wallet operation required';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  IF p_delta = 0 OR ABS(p_delta) > 1000000 THEN
    RAISE EXCEPTION 'Invalid OTP wallet adjustment';
  END IF;

  IF p_delta < 0 THEN
    PERFORM set_config('nava.wallet_operation', 'otp_purchase', true);

    UPDATE public.profiles
    SET balance = balance + p_delta
    WHERE id = p_user_id
      AND balance + p_delta >= 0
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  ELSE
    PERFORM set_config('nava.wallet_operation', 'otp_refund', true);

    UPDATE public.profiles
    SET balance = balance + p_delta
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
  END IF;

  RETURN v_new_balance;
END;
$nava$;

REVOKE ALL ON FUNCTION public.otp_balance_adjust_atomic(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.otp_balance_adjust_atomic(UUID, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.otp_balance_adjust_atomic(UUID, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.otp_balance_adjust_atomic(UUID, NUMERIC) TO service_role;

COMMIT;
