-- NAVA Phone foundation.
-- Intentionally isolated from the existing 5SIM OTP/order tables.

CREATE TABLE IF NOT EXISTS public.nava_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL UNIQUE,
  telnyx_phone_number_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'released')),
  country_code TEXT,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nava_phone_numbers_user_id_idx
  ON public.nava_phone_numbers(user_id);

CREATE TABLE IF NOT EXISTS public.nava_phone_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id UUID NOT NULL REFERENCES public.nava_phone_numbers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued',
  provider_message_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nava_phone_messages_user_id_created_at_idx
  ON public.nava_phone_messages(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS nava_phone_messages_phone_number_id_created_at_idx
  ON public.nava_phone_messages(phone_number_id, created_at DESC);

ALTER TABLE public.nava_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nava_phone_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their NAVA phone numbers"
  ON public.nava_phone_numbers;

CREATE POLICY "Users can view their NAVA phone numbers"
  ON public.nava_phone_numbers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their NAVA phone messages"
  ON public.nava_phone_messages;

CREATE POLICY "Users can view their NAVA phone messages"
  ON public.nava_phone_messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.nava_phone_numbers TO authenticated;
GRANT SELECT ON public.nava_phone_messages TO authenticated;
