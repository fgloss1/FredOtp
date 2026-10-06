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

-- Deposit intents are server-managed. With RLS enabled and no client policies,
-- authenticated users cannot directly create or modify financial intents.
-- Customer routes use the Supabase service-role client only after verifying auth.

-- Protect the real wallet balance from direct browser/Supabase writes.
-- Customer-facing code must use the authenticated deposit RPC; the only direct
-- profile balance writer that remains allowed is the NAVA admin.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
         'admin_complete_deposit_atomic'
       ) THEN
      RAISE EXCEPTION 'Profile balance may only be changed by NAVA server wallet operations';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_balance
  ON public.profiles;

CREATE TRIGGER protect_profile_balance
  BEFORE UPDATE OF balance ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_balance();

-- Crypto transaction rows are also server-created. This trigger protects the
-- financial table even if an existing authenticated INSERT policy exists.
CREATE OR REPLACE FUNCTION public.enforce_crypto_transaction_server_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_method ILIKE 'Crypto - %'
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Crypto transactions may only be created by the NAVA server';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_crypto_transaction_server_insert
  ON public.transactions;

CREATE TRIGGER enforce_crypto_transaction_server_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_crypto_transaction_server_insert();

-- Protect the financial transaction ledger from direct customer mutation.
-- New crypto rows are created server-side; the two wallet RPCs may update
-- their own transaction status atomically.
CREATE OR REPLACE FUNCTION public.protect_transaction_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $
DECLARE
  v_operation TEXT;
BEGIN
  v_operation := COALESCE(current_setting('nava.transaction_operation', true), '');

  IF COALESCE(auth.role(), '') = 'service_role'
     OR public.is_admin_user()
     OR v_operation IN (
       'complete_deposit_atomic',
       'admin_complete_deposit_atomic'
     ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'Financial transactions may only be changed by NAVA server operations or an admin';
END;
$;

DROP TRIGGER IF EXISTS protect_transaction_ledger
  ON public.transactions;

CREATE TRIGGER protect_transaction_ledger
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_transaction_ledger();

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

  PERFORM set_config(
    'nava.wallet_operation',
    'complete_deposit_atomic',
    true
  );

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_tx_amount
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM set_config(
    'nava.transaction_operation',
    'complete_deposit_atomic',
    true
  );

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

  PERFORM set_config(
    'nava.wallet_operation',
    'admin_complete_deposit_atomic',
    true
  );

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) + v_amount
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  PERFORM set_config(
    'nava.transaction_operation',
    'admin_complete_deposit_atomic',
    true
  );

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
