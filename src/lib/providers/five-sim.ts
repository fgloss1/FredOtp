import type { OtpProvider, ProviderOrder, ProviderQuote, ProviderSms } from "@/lib/providers/types";

const BASE_URL = "https://5sim.net/v1";
const PROVIDER_REQUEST_TIMEOUT_MS = 15000;

const COUNTRY_MAP: Record<string, string> = {
  NG: "nigeria",
  US: "usa",
  GB: "england",
  CA: "canada",
  GH: "ghana",
  KE: "kenya",
  ZA: "southafrica",
  EG: "egypt",
  IN: "india",
  PH: "philippines",
  ID: "indonesia",
  DE: "germany",
  FR: "france",
  NL: "netherlands",
  BR: "brazil",
  UA: "ukraine",
};

function token(): string | null {
  return process.env.FIVESIM_API_TOKEN?.trim() || null;
}

function countryName(code: string): string {
  const mapped = COUNTRY_MAP[code.toUpperCase()];
  if (!mapped) throw new Error(`5SIM country mapping is missing for ${code}.`);
  return mapped;
}

function productName(slug: string): string {
  const configured = process.env[`FIVESIM_PRODUCT_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`]?.trim();
  if (configured) return configured;

  const aliases: Record<string, string> = {
    gmail: "google",
    google: "google",
    outlook: "microsoft",
    microsoft: "microsoft",
  };

  return aliases[slug.toLowerCase()] ?? slug.toLowerCase();
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "string" && data.trim()
          ? data.trim()
          : typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).message === "string"
            ? String((data as Record<string, unknown>).message)
            : `5SIM request failed (${response.status})`;
      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("5SIM request timed out after 15 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type FiveSimPriceRow = {
  cost: number;
  count: number;
  rate?: number;
};

type FiveSimOrderResponse = {
  id: number;
  phone: string;
  price: number;
  status: string;
  sms?: Array<{ code?: string; text?: string; sender?: string }> | null;
};

function findCheapest(rows: Record<string, FiveSimPriceRow>): FiveSimPriceRow | null {
  const candidates = Object.values(rows).filter(
    (row) => Number(row.count) > 0 && Number.isFinite(Number(row.cost)),
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, row) =>
    Number(row.cost) < Number(best.cost) ? row : best,
  );
}

export const fiveSim: OtpProvider = {
  name: "5sim",

  async quote({ countryCode, serviceSlug }): Promise<ProviderQuote> {
    const country = countryName(countryCode);
    const product = productName(serviceSlug);

    const response = await jsonRequest<Record<string, Record<string, Record<string, FiveSimPriceRow>>>>(
      `${BASE_URL}/guest/prices?country=${encodeURIComponent(country)}&product=${encodeURIComponent(product)}`,
    );

    const countryRows = response[country];
    const productRows = countryRows?.[product];
    const row = productRows ? findCheapest(productRows) : null;

    return {
      provider: "5sim",
      available: Boolean(row),
      costCents: row ? Math.round(Number(row.cost) * 100) : null,
      successRate: row?.rate == null ? null : Number(row.rate),
    };
  },

  async buy({ countryCode, serviceSlug, maxCostCents }): Promise<ProviderOrder> {
    const apiToken = token();
    if (!apiToken) throw new Error("5SIM is not configured.");

    const country = countryName(countryCode);
    const product = productName(serviceSlug);

    const priceLimit =
      maxCostCents == null ? null : (maxCostCents / 100).toFixed(2);
    const query = priceLimit ? `?maxPrice=${encodeURIComponent(priceLimit)}` : "";

    const order = await jsonRequest<FiveSimOrderResponse>(
      `${BASE_URL}/user/buy/activation/${encodeURIComponent(country)}/any/${encodeURIComponent(product)}${query}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      },
    );

    if (!order?.id || !order.phone) {
      throw new Error("5SIM returned an invalid order.");
    }

    return {
      provider: "5sim",
      orderId: String(order.id),
      phoneNumber: order.phone,
      costCents: Math.round(Number(order.price) * 100),
      currency: "USD",
      status: order.status,
    };
  },

  async check(orderId): Promise<{ status: string; sms: ProviderSms | null }> {
    const apiToken = token();
    if (!apiToken) throw new Error("5SIM is not configured.");

    const order = await jsonRequest<FiveSimOrderResponse>(
      `${BASE_URL}/user/check/${encodeURIComponent(orderId)}`,
      {
        headers: { Authorization: `Bearer ${apiToken}` },
      },
    );

    const message = Array.isArray(order.sms) ? order.sms[0] : null;

    return {
      status: order.status,
      sms: message
        ? {
            code: message.code?.trim() || null,
            text: message.text?.trim() || null,
          }
        : null,
    };
  },

  async cancel(orderId): Promise<void> {
    const apiToken = token();
    if (!apiToken) throw new Error("5SIM is not configured.");

    await jsonRequest(`${BASE_URL}/user/cancel/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
  },

  async finish(orderId): Promise<void> {
    const apiToken = token();
    if (!apiToken) throw new Error("5SIM is not configured.");

    await jsonRequest(`${BASE_URL}/user/finish/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
  },
};
