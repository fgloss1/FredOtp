-- Add the OTP message body field expected by the authenticated OTP status API.
BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sms_text TEXT;

COMMIT;
