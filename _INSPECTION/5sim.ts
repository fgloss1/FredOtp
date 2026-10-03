/**
 * 5SIM API Client — Server-Side Only
 * Official v1 REST API Integration
 */

const FIVESIM_BASE = 'https://5sim.net/v1';

export function get5SimToken(): string {
  return process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY || '';
}

function guestHeaders(): Record<string, string> {
  return { Accept: 'application/json' };
}

function authHeaders(): Record<string, string> {
  const token = get5SimToken();
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`5SIM API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export interface FiveSimProductEntry {
  category?: string;
  qty?: number;
  count?: number;
  price?: number;
  cost?: number;
}

export type FiveSimAllPrices = Record<
  string,
  Record<string, FiveSimProductEntry | Record<string, FiveSimProductEntry>>
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
  sms: Array<{ code: string | null; text: string; created_at: string }>;
  created_at: string;
  country: string;
}

export async function getAllPrices(): Promise<FiveSimAllPrices> {
  return fetchJson<FiveSimAllPrices>(`${FIVESIM_BASE}/guest/prices`, guestHeaders());
}

export async function getPricesForCountryProduct(
  country: string,
  product: string
): Promise<FiveSimAllPrices> {
  const params = new URLSearchParams({ country: country.toLowerCase(), product: product.toLowerCase() });
  return fetchJson<FiveSimAllPrices>(`${FIVESIM_BASE}/guest/prices?${params}`, guestHeaders());
}

export async function getLive5SimPrice(country: string, product: string) {
  try {
    return await getPricesForCountryProduct(country, product);
  } catch (error) {
    console.warn(`[5SIM] getLive5SimPrice failed for ${country}/${product}:`, error);
    return null;
  }
}

export async function buyActivation(
  country: string,
  operator: string,
  product: string
): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(
    `${FIVESIM_BASE}/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`,
    authHeaders()
  );
}

export async function checkOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(`${FIVESIM_BASE}/user/check/${id}`, authHeaders());
}

export async function cancelOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(`${FIVESIM_BASE}/user/cancel/${id}`, authHeaders());
}

export async function finishOrder(id: number): Promise<FiveSimOrder> {
  return fetchJson<FiveSimOrder>(`${FIVESIM_BASE}/user/finish/${id}`, authHeaders());
}