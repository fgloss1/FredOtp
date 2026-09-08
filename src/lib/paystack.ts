import { createHmac, timingSafeEqual } from "node:crypto";

const PAYSTACK_API = "https://api.paystack.co";
const PAYSTACK_REQUEST_TIMEOUT_MS = 15000;

export type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string | null;
    metadata?: unknown;
  };
};

function secretKey(): string {
  const value = process.env.PAYSTACK_SECRET_KEY;
  if (!value) throw new Error("PAYSTACK_SECRET_KEY is required");
  return value;
}

export function paystackCurrency(): string {
  return (process.env.PAYSTACK_CURRENCY ?? "NGN").toUpperCase();
}

export function usdCentsToProviderMinor(amountCents: number): number {
  const rate = Number(process.env.PAYSTACK_USD_TO_NGN);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("PAYSTACK_USD_TO_NGN must be set to a positive number");
  }
  const naira = (amountCents / 100) * rate;
  return Math.round(naira * 100);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const actual = Buffer.from(expected, "utf8");
  if (provided.length !== actual.length) return false;
  return timingSafeEqual(provided, actual);
}

async function paystackFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYSTACK_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    const text = await response.text();
    let payload: (T & { message?: string }) | null = null;

    if (text) {
      try {
        payload = JSON.parse(text) as T & { message?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      throw new Error(payload?.message || `Paystack request failed with HTTP ${response.status}`);
    }

    if (!payload) {
      throw new Error("Paystack returned an invalid response.");
    }

    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Paystack request timed out after 15 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function initializePaystackTransaction(input: {
  email: string;
  reference: string;
  amountMinor: number;
  channels: string[];
  callbackUrl: string;
  metadata: Record<string, string | number>;
}): Promise<PaystackInitializeResponse> {
  return paystackFetch<PaystackInitializeResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: String(input.amountMinor),
      currency: paystackCurrency(),
      reference: input.reference,
      channels: input.channels,
      callback_url: input.callbackUrl,
      metadata: JSON.stringify(input.metadata),
    }),
  });
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResponse> {
  return paystackFetch<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}
