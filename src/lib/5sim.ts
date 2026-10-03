import { calculateNavaPrice, CalculatePriceResult } from "./pricing";

export interface FiveSimPriceItem {
  operator: string;
  cost: number;
  available: number;
}

export interface FiveSimPricesResponse {
  country: string;
  product: string;
  prices: FiveSimPriceItem[];
  lowestCost?: number;
  navaPricing?: CalculatePriceResult;
}

export function get5SimToken(): string | null {
  const token = process.env.FIVESIM_API_TOKEN || process.env.FIVESIM_API_KEY;
  if (!token || token === "your_5sim_key_here") return null;
  return token;
}

/**
 * READ-ONLY: Fetches live wholesale prices from 5SIM guest endpoint.
 * Zero cost, zero balance deduction, no purchases.
 */
export async function getLive5SimPrice(
  countryCode: string = "usa",
  serviceSlug: string = "whatsapp"
): Promise<FiveSimPricesResponse | null> {
  try {
    const token = get5SimToken();
    const countrySlug = countryCode.toLowerCase();
    const serviceQuery = serviceSlug.toLowerCase().includes("chatgpt") ? "openai" : serviceSlug.toLowerCase();

    const url = `https://5sim.net/v1/guest/prices?country=${countrySlug}&product=${serviceQuery}`;
    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const countryData = data[countrySlug] || data[countryCode] || data;
    const productData = countryData[serviceQuery] || countryData;

    const priceItems: FiveSimPriceItem[] = [];
    if (typeof productData === "object" && productData !== null) {
      for (const [operator, details] of Object.entries(productData)) {
        if (typeof details === "object" && details !== null && "cost" in details) {
          priceItems.push({
            operator,
            cost: Number((details as any).cost),
            available: Number((details as any).count || (details as any).available || 0),
          });
        }
      }
    }

    if (priceItems.length === 0) return null;

    const lowestCost = Math.min(...priceItems.map((p) => p.cost));
    const navaPricing = calculateNavaPrice(lowestCost, serviceQuery, countrySlug);

    return {
      country: countrySlug,
      product: serviceQuery,
      prices: priceItems,
      lowestCost,
      navaPricing,
    };
  } catch (err) {
    console.error("Error fetching live 5SIM prices:", err);
    return null;
  }
}