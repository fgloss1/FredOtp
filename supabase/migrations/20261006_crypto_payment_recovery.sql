-- NAVA crypto payment recovery workflow
-- Handles late, duplicate, and unmatched customer payments without weakening
-- the normal deposit-intent flow.
--
-- Recovery payments are exceptional and require authenticated admin approval.
-- The approval RPC performs the wallet credit and transaction-ledger insert
-- atomically.

BEGIN;

CREATE TABLE IF NOT EXISTS public.crypto_payment_recoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  deposit_intent_id UUID REFERENCES public.deposit_intents(id) ON DELETE SET NULL,
  coin TEXT NOT NULL CHECK (coin IN ('USDT', 'BTC', 'LTC')),
  network TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  claimed_amount_usd NUMERIC(12,2),
  reason TEXT NOT NULL CHECK (
    reason IN ('late_payment', 'duplicate_payment', 'unmatched_payment', 'other')
  ),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  verified_amount_usd NUMERIC(12,2),
  verified_block_timestamp TIMESTAMPTZ,
  verification_notes TEXT,
  transaction_id UUID,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS crypto_recovery_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_crypto_recovery_id_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_crypto_recovery_id_fkey
      FOREIGN KEY (crypto_recovery_id)
      REFERENCES public.crypto_payment_recoveries(id);
  END IF;
END $$;

DROP CONSTRAINT IF EXISTS transactions_crypto_requires_deposit_intent
  ON public.transactions;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_crypto_requires_deposit_intent
  CHECK (
    payment_method IS NULL
    OR payment_method NOT ILIKE 'Crypto - %'
    OR deposit_intent_id IS NOT NULL
    OR crypto_recovery_id IS NOT NULL
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_crypto_payment_recoveries_user_id
  ON public.crypto_payment_recoveries(user_id);

CREATE INDEX IF NOT EXISTS idx_crypto_payment_recoveries_status
  ON public.crypto_payment_recoveries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crypto_payment_recoveries_intent
  ON public.crypto_payment_recoveries(deposit_intent_id);

CREATE INDEX IF NOT EXISTS idx_transactions_crypto_recovery_id
  ON public.transactions(crypto_recovery_id);

ALTER TABLE public.crypto_payment_recoveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.crypto_payment_recoveries FROM PUBLIC;
REVOKE ALL ON TABLE public.crypto_payment_recoveries FROM anon;
REVOKE ALL ON TABLE public.crypto_payment_recoveries FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_complete_crypto_recovery_atomic(
  p_recovery_id UUID,
  p_verified_amount_usd NUMERIC,
  p_verified_block_timestamp TIMESTAMPTZ DEFAULT NULL,
  p_verification_notes TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_user_id UUID;
  v_intent_id UUID;
  v_coin TEXT;
  v_network TEXT;
  v_destination_address TEXT;
  v_tx_hash TEXT;
  v_status TEXT;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_existing_transaction UUID;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF p_verified_amount_usd IS NULL OR p_verified_amount_usd <= 0 THEN
    RAISE EXCEPTION 'Verified amount must be greater than zero';
  END IF;

  SELECT
    user_id,
    deposit_intent_id,
    coin,
    network,
    destination_address,
    tx_hash,
    status
  INTO
    v_user_id,
    v_intent_id,
    v_coin,
    v_network,
    v_destination_address,
    v_tx_hash,
    v_status
  FROM public.crypto_payment_recoveries
  WHERE id = p_recovery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crypto recovery report not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Crypto recovery report is no longer pending';
  END IF;

  SELECT id
    INTO v_existing_transaction
  FROM public.transactions
  WHERE reference = v_tx_hash
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'This Transaction Hash has already been recorded in NAVA';
  END IF;

  PERFORM set_config(
    'nava.wallet_operation',
    'admin_crypto_recovery',
    true
  );

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + p_verified_amount_usd
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer profile not found';
  END IF;

  PERFORM set_config(
    'nava.transaction_operation',
    'admin_crypto_recovery',
    true
  );

  INSERT INTO public.transactions (
    user_id,
    deposit_intent_id,
    crypto_recovery_id,
    amount_usd,
    amount_local,
    currency,
    payment_method,
    reference,
    status,
    block_timestamp
  )
  VALUES (
    v_user_id,
    v_intent_id,
    p_recovery_id,
    p_verified_amount_usd,
    ROUND(p_verified_amount_usd * 1500, 2),
    'USD',
    'Crypto Recovery - ' || v_coin ||
      CASE WHEN v_coin = 'USDT' THEN ' (TRC20)' ELSE '' END,
    v_tx_hash,
    'completed',
    p_verified_block_timestamp
  )
  RETURNING id INTO v_transaction_id;

  IF v_intent_id IS NOT NULL THEN
    UPDATE public.deposit_intents
    SET status = 'completed',
        completed_at = COALESCE(completed_at, NOW())
    WHERE id = v_intent_id
      AND status IN ('pending', 'expired');
  END IF;

  UPDATE public.crypto_payment_recoveries
  SET status = 'approved',
      verified_amount_usd = p_verified_amount_usd,
      verified_block_timestamp = p_verified_block_timestamp,
      verification_notes = p_verification_notes,
      transaction_id = v_transaction_id,
      reviewed_by = v_admin_id,
      reviewed_at = NOW()
  WHERE id = p_recovery_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to finalize crypto recovery report';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_complete_crypto_recovery_atomic(
  UUID, NUMERIC, TIMESTAMPTZ, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_crypto_recovery_atomic(
  UUID, NUMERIC, TIMESTAMPTZ, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_crypto_recovery_atomic(
  UUID, NUMERIC, TIMESTAMPTZ, TEXT
) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_crypto_recovery_atomic(
  p_recovery_id UUID,
  p_rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.crypto_payment_recoveries
  SET status = 'rejected',
      verification_notes = NULLIF(TRIM(p_rejection_reason), ''),
      reviewed_by = v_admin_id,
      reviewed_at = NOW()
  WHERE id = p_recovery_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crypto recovery report is not pending or does not exist';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_crypto_recovery_atomic(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_crypto_recovery_atomic(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_crypto_recovery_atomic(UUID, TEXT) TO authenticated;

COMMIT;
