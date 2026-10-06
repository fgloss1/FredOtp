-- NAVA crypto deposit security migration
-- Apply to the Supabase database used by the crypto API.
-- This migration deliberately keeps legacy transaction rows intact.
-- Crypto transaction rows created by the new API must reference a deposit intent.

BEGIN;

CREATE TABLE IF NOT EXISTS public.deposit_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin TEXT NOT NULL,
  network TEXT NOT NULL,
  expected_amount_usd NUMERIC(12,2) NOT NULL CHECK (expected_amount_usd > 0),
  destination_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deposit_intents_user_id
  ON public.deposit_intents(user_id);

CREATE INDEX IF NOT EXISTS idx_deposit_intents_status
  ON public.deposit_intents(status);

CREATE INDEX IF NOT EXISTS idx_deposit_intents_expires_at
  ON public.deposit_intents(expires_at);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS deposit_intent_id UUID;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS block_timestamp TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_deposit_intent_id_fkey'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_deposit_intent_id_fkey
      FOREIGN KEY (deposit_intent_id)
      REFERENCES public.deposit_intents(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_deposit_intent_id
  ON public.transactions(deposit_intent_id);

CREATE INDEX IF NOT EXISTS idx_transactions_block_timestamp
  ON public.transactions(block_timestamp);

-- The existing deployment already has a UNIQUE constraint on transactions.reference.
-- No redundant unique index is created here.

-- Enforce the intent requirement for newly-created crypto transactions.
-- NOT VALID preserves legacy rows that predate this security model, while
-- PostgreSQL still enforces the check for new/updated rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_crypto_requires_deposit_intent'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_crypto_requires_deposit_intent
      CHECK (
        payment_method IS NULL
        OR payment_method NOT ILIKE 'Crypto - %'
        OR deposit_intent_id IS NOT NULL
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.deposit_intents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.complete_deposit_atomic(
  p_intent_id UUID,
  p_transaction_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_intent_user_id UUID;
  v_intent_status TEXT;
  v_intent_created_at TIMESTAMPTZ;
  v_intent_expires_at TIMESTAMPTZ;
  v_tx_user_id UUID;
  v_tx_status TEXT;
  v_tx_intent_id UUID;
  v_tx_amount NUMERIC;
  v_tx_block_timestamp TIMESTAMPTZ;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT user_id, status, created_at, expires_at
    INTO v_intent_user_id, v_intent_status, v_intent_created_at, v_intent_expires_at
  FROM public.deposit_intents
  WHERE id = p_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit intent not found';
  END IF;

  IF v_intent_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Deposit intent does not belong to authenticated user';
  END IF;

  IF v_intent_status <> 'pending' THEN
    RAISE EXCEPTION 'Deposit intent is not pending';
  END IF;

  IF v_intent_expires_at <= NOW() THEN
    RAISE EXCEPTION 'Deposit intent has expired';
  END IF;

  SELECT user_id, status, deposit_intent_id, amount_usd, block_timestamp
    INTO v_tx_user_id, v_tx_status, v_tx_intent_id, v_tx_amount, v_tx_block_timestamp
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_tx_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Transaction does not belong to authenticated user';
  END IF;

  IF v_tx_status <> 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  IF v_tx_intent_id IS DISTINCT FROM p_intent_id THEN
    RAISE EXCEPTION 'Transaction is not linked to this deposit intent';
  END IF;

  IF v_tx_amount IS NULL OR v_tx_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount is invalid';
  END IF;

  IF v_tx_block_timestamp IS NULL THEN
    RAISE EXCEPTION 'Blockchain timestamp is missing';
  END IF;

  IF v_tx_block_timestamp <= v_intent_created_at THEN
    RAISE EXCEPTION 'Blockchain transaction occurred before the deposit intent';
  END IF;

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_tx_amount
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE public.transactions
  SET status = 'completed'
  WHERE id = p_transaction_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to complete transaction';
  END IF;

  UPDATE public.deposit_intents
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_intent_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to complete deposit intent';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_deposit_atomic(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_deposit_atomic(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_deposit_atomic(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_complete_deposit_atomic(
  p_transaction_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_role TEXT;
  v_user_id UUID;
  v_intent_id UUID;
  v_status TEXT;
  v_amount NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role
    INTO v_admin_role
  FROM public.profiles
  WHERE id = v_admin_id;

  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT user_id, deposit_intent_id, status, amount_usd
    INTO v_user_id, v_intent_id, v_status, v_amount
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  IF v_intent_id IS NULL THEN
    RAISE EXCEPTION 'Crypto transaction has no deposit intent';
  END IF;

  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount is invalid';
  END IF;

  PERFORM 1
  FROM public.deposit_intents
  WHERE id = v_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit intent not found';
  END IF;

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_amount
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  UPDATE public.transactions
  SET status = 'completed'
  WHERE id = p_transaction_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to complete transaction';
  END IF;

  UPDATE public.deposit_intents
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = v_intent_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to complete deposit intent';
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_complete_deposit_atomic(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_deposit_atomic(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_complete_deposit_atomic(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.add_balance_atomic(NUMERIC);

COMMIT;
