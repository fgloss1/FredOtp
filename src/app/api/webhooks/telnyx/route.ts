import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telnyx Messaging webhook
 * - Verifies Ed25519 signature (Telnyx-Signature-Ed25519 + Telnyx-Timestamp)
 * - Handles inbound SMS (message.received)
 * - Maps "to" number â†’ nava_phone_numbers
 * - Inserts into nava_phone_messages
 *
 * Env required:
 *   TELNYX_PUBLIC_KEY          (base64 Ed25519 public key from Telnyx Mission Control)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (server-only; bypasses RLS for webhook inserts)
 *
 * Optional:
 *   TELNYX_WEBHOOK_MAX_SKEW_SEC  (default 300)
 */

type TelnyxInboundPayload = {
  data?: {
    event_type?: string;
    id?: string;
    occurred_at?: string;
    payload?: {
      direction?: string;
      id?: string; // Telnyx message id
      from?: { phone_number?: string };
      to?: Array<{ phone_number?: string; status?: string }> | { phone_number?: string; status?: string };
      text?: string;
      errors?: Array<{ code?: string; title?: string; detail?: string }>;
      type?: string;
      received_at?: string;
      encoding?: string;
      media?: unknown[];
    };
  };
  meta?: unknown;
};

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  // US fallback if 11 digits starting with 1, or 10-digit national
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function extractToNumbers(toField: TelnyxInboundPayload["data"]): string[] {
  const payload = toField?.payload;
  if (!payload?.to) return [];
  if (Array.isArray(payload.to)) {
    return payload.to
      .map((t) => normalizeE164(t?.phone_number))
      .filter((n): n is string => Boolean(n));
  }
  const single = normalizeE164((payload.to as { phone_number?: string })?.phone_number);
  return single ? [single] : [];
}

/**
 * Verify Telnyx Ed25519 webhook signature.
 * Signed payload = `${timestamp}|${rawBody}`
 * Header: telnyx-signature-ed25519 (base64), telnyx-timestamp (unix sec)
 * @see https://developers.telnyx.com/docs/api/v2/overview#webhook-signing
 */
function verifyTelnyxSignature(opts: {
  rawBody: string;
  signatureB64: string | null;
  timestamp: string | null;
  publicKeyB64: string;
  maxSkewSec: number;
}): { ok: true } | { ok: false; reason: string } {
  const { rawBody, signatureB64, timestamp, publicKeyB64, maxSkewSec } = opts;

  if (!signatureB64 || !timestamp) {
    return { ok: false, reason: "Missing Telnyx-Signature-Ed25519 or Telnyx-Timestamp" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: "Invalid Telnyx-Timestamp" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > maxSkewSec) {
    return { ok: false, reason: "Timestamp outside allowed skew" };
  }

  try {
    const keyBytes = Buffer.from(publicKeyB64, "base64");
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const publicKey = crypto.createPublicKey({
      key: keyBytes.length === 32 ? Buffer.concat([spkiPrefix, keyBytes]) : keyBytes,
      format: "der",
      type: "spki",
    });

    const signedPayload = Buffer.from(`${timestamp}|${rawBody}`, "utf8");
    const signature = Buffer.from(signatureB64, "base64");

    const valid = crypto.verify(null, signedPayload, publicKey, signature);
    if (!valid) return { ok: false, reason: "Invalid signature" };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: `Signature verify error: ${err?.message || "unknown"}` };
  }
}

function isOutboundDeliveryEvent(body: TelnyxInboundPayload): boolean {
  const eventType = String(body?.data?.event_type || "").toLowerCase();
  return eventType === "message.sent" || eventType === "message.finalized";
}

function outboundDeliveryStatus(body: TelnyxInboundPayload): {
  providerMessageId: string | null;
  status: string;
  errors: Array<{ code?: string; title?: string; detail?: string }>;
} {
  const payload = body.data?.payload;
  const providerMessageId = payload?.id || body.data?.id || null;
  const firstTo = Array.isArray(payload?.to) ? payload.to[0] : payload?.to;
  const rawStatus = String(firstTo?.status || "").toLowerCase();
  const eventType = String(body?.data?.event_type || "").toLowerCase();

  let status = rawStatus || (eventType === "message.sent" ? "sent" : "completed");
  if (status === "sending_failed" || status === "delivery_failed") status = "failed";
  if (status === "delivery_unconfirmed") status = "unconfirmed";

  return {
    providerMessageId,
    status,
    errors: Array.isArray(payload?.errors) ? payload.errors : [],
  };
}

function isInboundSmsEvent(body: TelnyxInboundPayload): boolean {
  const eventType = String(body?.data?.event_type || "").toLowerCase();
  const direction = String(body?.data?.payload?.direction || "").toLowerCase();
  const msgType = String(body?.data?.payload?.type || "").toLowerCase();

  // Primary: message.received
  if (eventType === "message.received") return true;

  // Fallback shapes some accounts emit
  if (eventType.includes("message") && direction === "inbound") return true;
  if (direction === "inbound" && (msgType === "sms" || msgType === "mms" || !msgType)) {
    return Boolean(body?.data?.payload?.text || body?.data?.payload?.from);
  }
  return false;
}

export async function POST(req: NextRequest) {
  const publicKey = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKey) {
    console.error("[telnyx-webhook] TELNYX_PUBLIC_KEY is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const maxSkewSec = Number(process.env.TELNYX_WEBHOOK_MAX_SKEW_SEC || 300);
  const rawBody = await req.text();

  const signature =
    req.headers.get("telnyx-signature-ed25519") ||
    req.headers.get("Telnyx-Signature-Ed25519");
  const timestamp =
    req.headers.get("telnyx-timestamp") ||
    req.headers.get("Telnyx-Timestamp");

  const verified = verifyTelnyxSignature({
    rawBody,
    signatureB64: signature,
    timestamp,
    publicKeyB64: publicKey,
    maxSkewSec,
  });

  if (!verified.ok) {
    console.warn("[telnyx-webhook] auth failed:", verified.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: TelnyxInboundPayload;
  try {
    body = JSON.parse(rawBody) as TelnyxInboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (isOutboundDeliveryEvent(body)) {
    const { providerMessageId, status, errors } = outboundDeliveryStatus(body);

    if (!providerMessageId) {
      return NextResponse.json({
        received: true,
        handled: false,
        reason: "outbound_missing_provider_message_id",
      });
    }

    try {
      const supabase = getServiceSupabase();
      const { data: updated, error: updateError } = await supabase
        .from("nava_phone_messages")
        .update({ status })
        .eq("provider_message_id", providerMessageId)
        .select("id")
        .maybeSingle();

      if (updateError) {
        console.error("[telnyx-webhook] outbound status update failed:", updateError);
        return NextResponse.json({ error: "Status update failed" }, { status: 500 });
      }

      if (errors.length > 0) {
        console.warn("[telnyx-webhook] outbound delivery status:", {
          providerMessageId,
          status,
          errors: errors.map((error) => ({
            code: error?.code,
            title: error?.title,
            detail: error?.detail,
          })),
        });
      } else {
        console.log("[telnyx-webhook] outbound delivery status:", {
          providerMessageId,
          status,
        });
      }

      return NextResponse.json({
        received: true,
        handled: true,
        updated: Boolean(updated?.id),
        status,
        provider_message_id: providerMessageId,
      });
    } catch (err: any) {
      console.error("[telnyx-webhook] outbound status handler failed:", err);
      return NextResponse.json(
        { error: err?.message || "Outbound status handler error" },
        { status: 500 },
      );
    }
  }

  // Always ACK non-inbound quickly (delivery updates, etc.)
  if (!isInboundSmsEvent(body)) {
    return NextResponse.json({
      received: true,
      handled: false,
      event_type: body?.data?.event_type ?? null,
    });
  }

  const payload = body.data?.payload;
  const telnyxMessageId = payload?.id || body.data?.id || null;
  const fromNumber = normalizeE164(payload?.from?.phone_number);
  const toCandidates = extractToNumbers(body.data);
  const text = typeof payload?.text === "string" ? payload.text : "";
  const occurredAt =
    payload?.received_at || body.data?.occurred_at || new Date().toISOString();

  if (!fromNumber || toCandidates.length === 0) {
    console.warn("[telnyx-webhook] inbound missing from/to", {
      telnyxMessageId,
      fromNumber,
      toCandidates,
    });
    // Still 200 so Telnyx does not retry forever on malformed test payloads
    return NextResponse.json({
      received: true,
      handled: false,
      reason: "missing_from_or_to",
    });
  }

  try {
    const supabase = getServiceSupabase();

    // Find NAVA number matching any "to" candidate (E.164)
    const { data: navaNumbers, error: lookupError } = await supabase
      .from("nava_phone_numbers")
      .select("id, phone_number, user_id, status")
      .in("phone_number", toCandidates)
      .eq("status", "active")
      .limit(5);

    if (lookupError) {
      console.error("[telnyx-webhook] number lookup failed:", lookupError);
      return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }

    const navaNumber = navaNumbers?.[0];
    if (!navaNumber) {
      console.warn("[telnyx-webhook] no NAVA number for to=", toCandidates);
      return NextResponse.json({
        received: true,
        handled: false,
        reason: "unknown_destination",
        to: toCandidates,
      });
    }

    const toNumber = normalizeE164(navaNumber.phone_number) || toCandidates[0];

    // Idempotent insert: unique on provider_message_id if you add that column/constraint
    const row = {
      phone_number_id: navaNumber.id,
      user_id: navaNumber.user_id,
      direction: "inbound" as const,
      from_number: fromNumber,
      to_number: toNumber,
      body: text,
      status: "received",
      provider_message_id: telnyxMessageId,
      created_at: occurredAt,
    };

    // Prefer upsert when provider_message_id is unique
    const { data: inserted, error: insertError } = await supabase
      .from("nava_phone_messages")
      .upsert(row, {
        onConflict: "provider_message_id",
        ignoreDuplicates: true,
      })
      .select("id")
      .maybeSingle();

    // If upsert fails because column/constraint missing, fall back to plain insert
    if (insertError) {
      const msg = String(insertError.message || "");
      const missingConflict =
        msg.toLowerCase().includes("on conflict") ||
        msg.toLowerCase().includes("provider_message_id") ||
        msg.toLowerCase().includes("raw");

      if (!missingConflict) {
        console.error("[telnyx-webhook] insert failed:", insertError);
        return NextResponse.json({ error: "Persist failed" }, { status: 500 });
      }

      // Fallback insert without optional columns
      const fallback = {
        phone_number_id: navaNumber.id,
        user_id: navaNumber.user_id,
        provider_message_id: telnyxMessageId,
        direction: "inbound" as const,
        from_number: fromNumber,
        to_number: toNumber,
        body: text,
        status: "received",
        created_at: occurredAt,
      };

      // Dedupe manually if possible
      if (telnyxMessageId) {
        const { data: existing } = await supabase
          .from("nava_phone_messages")
          .select("id")
          .eq("from_number", fromNumber)
          .eq("to_number", toNumber)
          .eq("body", text)
          .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          return NextResponse.json({
            received: true,
            handled: true,
            duplicate: true,
            message_id: existing[0].id,
          });
        }
      }

      const { data: inserted2, error: insertError2 } = await supabase
        .from("nava_phone_messages")
        .insert(fallback)
        .select("id")
        .maybeSingle();

      if (insertError2) {
        console.error("[telnyx-webhook] fallback insert failed:", insertError2);
        return NextResponse.json({ error: "Persist failed" }, { status: 500 });
      }

      return NextResponse.json({
        received: true,
        handled: true,
        message_id: inserted2?.id ?? null,
        phone_number_id: navaNumber.id,
      });
    }

    return NextResponse.json({
      received: true,
      handled: true,
      message_id: inserted?.id ?? null,
      phone_number_id: navaNumber.id,
    });
  } catch (err: any) {
    console.error("[telnyx-webhook] unhandled:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook handler error" },
      { status: 500 },
    );
  }
}

// Telnyx may occasionally GET for health checks
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "nava-telnyx-webhook",
    ts: new Date().toISOString(),
  });
}






