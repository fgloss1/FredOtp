/**
 * 5SIM API Client — Server-Side Only
 *
 * Live catalog source:
 *   https://5sim.net/v1/guest/prices
 *
 * 5SIM guest prices are public and do not require an API token.
 *
 * Live price fields:
 *   cost  = number price
 *   count = available quantity
 *   rate  = SMS delivery percentage
 */

const FIVESIM_BASE = "https://5sim.net/v1";

export function get5SimToken(): string {
  return process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY || "";
}

function guestHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
  };
}

function authHeaders(): Record<string, string> {
  const token = get5SimToken();

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(
      `5SIM API ${response.status}: ${body.slice(0, 300)}`
    );
  }

  return (await response.json()) as T;
}

export interface FiveSimOperatorPrice {
  cost?: number;
  count?: number;
  rate?: number;
}

export type FiveSimAllPrices = Record<
  string,
  Record<string, Record<string, FiveSimOperatorPrice>>
>;

export interface FiveSimOrder {
  id: number;
  phone: string;
  operator: string;
  product: string;
  price: number;
  status: string;
  expires: string;
  code: string | null;
  sms: Array<{
    code: string | null;
    text: string;
    created_at: string;
  }>;
  created_at: string;
  country: string;
}

/**
 * GET /guest/prices
 *
 * Response:
 * {
 *   "england": {
 *     "facebook": {
 *       "vodafone": {
 *         "cost": 4,
 *         "count": 1260,
 *         "rate": 99.99
 *       }
 *     }
 *   }
 * }
 */
export async function getAllPrices(): Promise<FiveSimAllPrices> {
  return fetchJson<FiveSimAllPrices>(
    `${FIVESIM_BASE}/guest/prices`,
    guestHeaders()
  );
}

/**
 * GET /guest/prices?product=<product>
 *
 * Response:
 * {
 *   "facebook": {
 *     "england": {
 *       "vodafone": {
 *         "cost": 4,
 *         "count": 1260,
 *         "rate": 99.99
 *       }
 *     }
 *   }
 * }
 */
export async function getPricesForProduct(
  product: string
): Promise<Record<string, Record<string, Record<string, FiveSimOperatorPrice>>>> {
  const cleanProduct = product.trim().toLowerCase();

  if (!cleanProduct) {
    throw new Error("5SIM product is required");
  }

  const params = new URLSearchParams({
    product: cleanProduct,
  });

  return fetchJson<
    Record<string, Record<string, Record<string, FiveSimOperatorPrice>>>
  >(
    `${FIVESIM_BASE}/guest/prices?${params.toString()}`,
    guestHeaders()
  );
}

/**
 * GET /guest/prices?country=<country>&product=<product>
 */
export async function getPricesForCountryProduct(
  country: string,
  product: string
): Promise<Record<string, any>> {
  const params = new URLSearchParams({
    country: country.trim().toLowerCase(),
    product: product.trim().toLowerCase(),
  });

  return fetchJson<Record<string, any>>(
    `${FIVESIM_BASE}/guest/prices?${params.toString()}`,
    guestHeaders()
  );
}

export async function getLive5SimPrice(
  country: string,
  product: string
): Promise<Record<string, any> | null> {
  try {
    return await getPricesForCountryProduct(country, product);
  } catch (error) {
    console.warn(
      `[5SIM] getLive5SimPrice failed for ${country}/${product}:`,
      error
    );

    return null;
  }
}

/**
 * Buy activation number.
 */
export async function buyActivation(
  country: string,
  operator: string,
  product: string
): Promise<FiveSimOrder> {
  const cleanCountry = country.trim().toLowerCase();
  const cleanOperator = operator.trim().toLowerCase();
  const cleanProduct = product.trim().toLowerCase();

  return fetchJson<FiveSimOrder>(
    `${FIVESIM_BASE}/user/buy/activation/${encodeURIComponent(
      cleanCountry
    )}/${encodeURIComponent(cleanOperator)}/${encodeURIComponent(
      cleanProduct
    )}`,
    authHeaders()
  );
}

export async function checkOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(
    `${FIVESIM_BASE}/user/check/${id}`,
    authHeaders()
  );
}

export async function cancelOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(
    `${FIVESIM_BASE}/user/cancel/${id}`,
    authHeaders()
  );
}

export async function finishOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(
    `${FIVESIM_BASE}/user/finish/${id}`,
    authHeaders()
  );
}
