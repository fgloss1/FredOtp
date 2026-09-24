import Telnyx from "telnyx";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { smsMessages } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function extractOtpCode(text: string): string | null {
  const matches = text.match(/\b\d{4,8}\b/g);
  return matches?.[0] ?? null;
}

export async function POST(request: Request) {
  const publicKey = process.env.TELNYX_PUBLIC_KEY;

  if (!publicKey) {
    console.error("Telnyx webhook received but TELNYX_PUBLIC_KEY is missing.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const rawBody = await request.text();

  try {
    const headers = Object.fromEntries(request.headers.entries());
    const telnyx = new Telnyx({
      apiKey: process.env.TELNYX_API_KEY,
      publicKey,
    });

    const event = (await telnyx.webhooks.unwrap(rawBody, {
      headers,
    })) as {
      data?: {
        event_type?: string;
        payload?: {
          id?: string;
          text?: string;
          from?: { phone_number?: string };
          to?: Array<{ phone_number?: string }>;
        };
        occurred_at?: string;
      };
    };

    if (event.data?.event_type !== "message.received") {
      return Response.json({ ok: true, ignored: true });
    }

    const payload = event.data.payload;
    const messageId = payload?.id;
    const fromNumber = payload?.from?.phone_number;
    const toNumber = payload?.to?.[0]?.phone_number;
    const text = payload?.text ?? "";

    if (!messageId || !fromNumber || !toNumber) {
      return new Response("Missing message fields", { status: 400 });
    }

    const expectedNumber = process.env.TELNYX_CALLER_ID;
    if (expectedNumber && toNumber !== expectedNumber) {
      return Response.json({ ok: true, ignored: true });
    }

    const ownerUserId = Number(process.env.NAVA_PHONE_OWNER_USER_ID);
    if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) {
      console.error("NAVA_PHONE_OWNER_USER_ID is missing or invalid.");
      return new Response("Webhook owner is not configured", { status: 500 });
    }

    const existing = await db
      .select({ id: smsMessages.id })
      .from(smsMessages)
      .where(eq(smsMessages.messageId, messageId))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ ok: true, duplicate: true });
    }

    await db.insert(smsMessages).values({
      userId: ownerUserId,
      messageId,
      fromNumber,
      toNumber,
      text,
      otpCode: extractOtpCode(text),
      receivedAt: event.data.occurred_at
        ? new Date(event.data.occurred_at)
        : new Date(),
    });

    return Response.json({ ok: true, stored: true });
  } catch (error: any) {
    if (error?.name === "TelnyxWebhookVerificationError") {
      console.error("Telnyx webhook verification failed.");
      return new Response("Invalid signature", { status: 401 });
    }

    console.error("Telnyx SMS webhook error", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
