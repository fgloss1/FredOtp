import type { OtpProvider, ProviderOrder, ProviderQuote, ProviderSms } from "@/lib/providers/types";

const BASE_URL = "https://api.sms-man.com/control";
const CURRENCY = (process.env.SMSMAN_CURRENCY || "USD").trim().toUpperCase();
const PROVIDER_REQUEST_TIMEOUT_MS = 15000;

const COUNTRY_OVERRIDE_KEYS: Record<string, string> = {
  NG: "SMSMAN_COUNTRY_NG",
  US: "SMSMAN_COUNTRY_US",
  GB: "SMSMAN_COUNTRY_GB",
  CA: "SMSMAN_COUNTRY_CA",
  GH: "SMSMAN_COUNTRY_GH",
  KE: "SMSMAN_COUNTRY_KE",
  ZA: "SMSMAN_COUNTRY_ZA",
  EG: "SMSMAN_COUNTRY_EG",
  IN: "SMSMAN_COUNTRY_IN",
  PH: "SMSMAN_COUNTRY_PH",
  ID: "SMSMAN_COUNTRY_ID",
  DE: "SMSMAN_COUNTRY_DE",
  FR: "SMSMAN_COUNTRY_FR",
  NL: "SMSMAN_COUNTRY_NL",
  BR: "SMSMAN_COUNTRY_BR",
  UA: "SMSMAN_COUNTRY_UA",
};

const COUNTRY_NAMES: Record<string, string[]> = {
  NG: ["nigeria"],
  US: ["usa", "united states", "united states of america"],
  GB: ["england", "united kingdom", "great britain"],
  CA: ["canada"],
  GH: ["ghana"],
  KE: ["kenya"],
  ZA: ["south africa"],
  EG: ["egypt"],
  IN: ["india"],
  PH: ["philippines"],
  ID: ["indonesia"],
  DE: ["germany"],
  FR: ["france"],
  NL: ["netherlands", "the netherlands"],
  BR: ["brazil"],
  UA: ["ukraine"],
};

function token(): string | null {
  return process.env.SMSMAN_API_TOKEN?.trim() || null;
}

async function jsonRequest<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const text = await response.text();
    let data: unknown = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null && typeof (data as Record<string, unknown>).error_msg === "string"
          ? String((data as Record<string, unknown>).error_msg)
          : `SMS-Man request failed (${response.status})`;
      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SMS-Man request timed out after 15 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

type SmsManCountry = {
  id: number | string;
  title?: string;
  name_en?: string;
};

type SmsManApplication = {
  id: number | string;
  code?: string;
  name?: string;
};

type SmsManPriceTable = Record<string, Record<string, { cost: string | number; count: string | number }>>;

type SmsManNumberResponse = {
  request_id: number | string;
  country_id: number | string;
  application_id: number | string;
  number: string;
};

type SmsManSmsResponse = {
  request_id?: number | string;
  sms_code?: string;
  sms_text?: string;
  text?: string;
  error_code?: string;
};

type SmsManCountriesCache = { expiresAt: number; items: SmsManCountry[] };
type SmsManApplicationsCache = { expiresAt: number; items: SmsManApplication[] };

let countriesCache: SmsManCountriesCache | null = null;
let applicationsCache: SmsManApplicationsCache | null = null;
const CACHE_MS = 5 * 60 * 1000;

async function getCountries(): Promise<SmsManCountry[]> {
  const apiToken = token();
  if (!apiToken) throw new Error("SMS-Man is not configured.");

  if (countriesCache && countriesCache.expiresAt > Date.now()) return countriesCache.items;

  const items = await jsonRequest<SmsManCountry[]>(
    `${BASE_URL}/countries?token=${encodeURIComponent(apiToken)}`,
  );
  countriesCache = { expiresAt: Date.now() + CACHE_MS, items };
  return items;
}

async function getApplications(): Promise<SmsManApplication[]> {
  const apiToken = token();
  if (!apiToken) throw new Error("SMS-Man is not configured.");

  if (applicationsCache && applicationsCache.expiresAt > Date.now()) return applicationsCache.items;

  const items = await jsonRequest<SmsManApplication[]>(
    `${BASE_URL}/applications?token=${encodeURIComponent(apiToken)}`,
  );
  applicationsCache = { expiresAt: Date.now() + CACHE_MS, items };
  return items;
}

async function resolveCountryId(countryCode: string): Promise<number> {
  const normalized = countryCode.toUpperCase();
  const overrideKey = COUNTRY_OVERRIDE_KEYS[normalized];
  const override = overrideKey ? process.env[overrideKey]?.trim() : null;
  if (override && /^\d+$/.test(override)) return Number(override);

  const expectedNames = COUNTRY_NAMES[normalized];
  if (!expectedNames) throw new Error(`SMS-Man country mapping is missing for ${countryCode}.`);

  const countries = await getCountries();
  const match = countries.find((item) => {
    const title = String(item.title ?? item.name_en ?? "").trim().toLowerCase();
    return expectedNames.includes(title);
  });

  if (!match) throw new Error(`SMS-Man country mapping is missing for ${countryCode}.`);
  return Number(match.id);
}

async function resolveApplicationId(serviceSlug: string): Promise<number> {
  const configured = process.env[
    `SMSMAN_APPLICATION_${serviceSlug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
  ]?.trim();
  if (configured && /^\d+$/.test(configured)) return Number(configured);

  const aliases: Record<string, string[]> = {
    gmail: ["google", "gmail"],
    google: ["google"],
    outlook: ["microsoft", "outlook"],
    microsoft: ["microsoft", "outlook"],
    whatsapp: ["whatsapp"],
    telegram: ["telegram"],
  };
  const wanted = aliases[serviceSlug.toLowerCase()] ?? [serviceSlug.toLowerCase()];
  const applications = await getApplications();

  const match = applications.find((item) => {
    const code = String(item.code ?? "").trim().toLowerCase();
    const name = String(item.name ?? "").trim().toLowerCase();
    return wanted.includes(code) || wanted.includes(name);
  });

  if (!match) throw new Error(`SMS-Man application mapping is missing for ${serviceSlug}.`);
  return Number(match.id);
}

function findPrice(
  table: SmsManPriceTable,
  countryId: number,
  applicationId: number,
): { cost: number; count: number } | null {
  const countryRows = table[String(countryId)];
  if (!countryRows) return null;

  const row = countryRows[String(applicationId)];
  if (!row) return null;

  const cost = Number(row.cost);
  const count = Number(row.count);
  if (count <= 0 || !Number.isFinite(cost)) return null;

  return { cost, count };
}

export const smsMan: OtpProvider = {
  name: "sms-man",

  async quote({ countryCode, serviceSlug }): Promise<ProviderQuote> {
    const apiToken = token();
    if (!apiToken) throw new Error("SMS-Man is not configured.");

    const countryId = await resolveCountryId(countryCode);
    const applicationId = await resolveApplicationId(serviceSlug);

    const prices = await jsonRequest<SmsManPriceTable>(
      `${BASE_URL}/get-prices?token=${encodeURIComponent(apiToken)}&country_id=${countryId}`,
    );

    const row = findPrice(prices, countryId, applicationId);

    return {
      provider: "sms-man",
      available: Boolean(row),
      costCents: row ? Math.round(row.cost * 100) : null,
      successRate: null,
    };
  },

  async buy({ countryCode, serviceSlug, maxCostCents }): Promise<ProviderOrder> {
    const apiToken = token();
    if (!apiToken) throw new Error("SMS-Man is not configured.");

    if (CURRENCY !== "USD") {
      throw new Error("SMS-Man currency must be USD for provider cost comparison.");
    }

    const countryId = await resolveCountryId(countryCode);
    const applicationId = await resolveApplicationId(serviceSlug);
    const maxPrice = maxCostCents == null ? null : Math.max(0, Math.floor(maxCostCents / 100));
    const params = new URLSearchParams({
      token: apiToken,
      country_id: String(countryId),
      application_id: String(applicationId),
      currency: CURRENCY,
    });
    if (maxPrice != null) params.set("maxPrice", String(maxPrice));

    const order = await jsonRequest<SmsManNumberResponse>(
      `${BASE_URL}/get-number?${params.toString()}`,
    );

    if (!order?.request_id || !order.number) {
      throw new Error("SMS-Man returned an invalid order.");
    }

    return {
      provider: "sms-man",
      orderId: String(order.request_id),
      phoneNumber: order.number,
      costCents: maxCostCents ?? 0,
      currency: CURRENCY,
      status: "PENDING",
    };
  },

  async check(orderId): Promise<{ status: string; sms: ProviderSms | null }> {
    const apiToken = token();
    if (!apiToken) throw new Error("SMS-Man is not configured.");

    const response = await jsonRequest<SmsManSmsResponse>(
      `${BASE_URL}/get-sms?token=${encodeURIComponent(apiToken)}&request_id=${encodeURIComponent(orderId)}`,
    );

    if (response.error_code === "wait_sms") {
      return { status: "PENDING", sms: null };
    }

    if (response.sms_code) {
      return {
        status: "RECEIVED",
        sms: {
          code: response.sms_code.trim() || null,
          text: response.sms_text?.trim() || response.text?.trim() || null,
        },
      };
    }

    return { status: "PENDING", sms: null };
  },

  async cancel(orderId): Promise<void> {
    const apiToken = token();
    if (!apiToken) throw new Error("SMS-Man is not configured.");

    await jsonRequest(
      `${BASE_URL}/set-status?token=${encodeURIComponent(apiToken)}&request_id=${encodeURIComponent(orderId)}&status=close`,
    );
  },

  async finish(orderId): Promise<void> {
    const apiToken = token();
    if (!apiToken) throw new Error("SMS-Man is not configured.");

    await jsonRequest(
      `${BASE_URL}/set-status?token=${encodeURIComponent(apiToken)}&request_id=${encodeURIComponent(orderId)}&status=used`,
    );
  },
};