/**
 * NAVA OTP Catalog Normalization Service
 * Supports App-First UX: Fetches global services, sorts countries by price.
 */

import { getAllPrices, getCountryCatalog, type FiveSimCountryCatalog } from './5sim';
import { cacheGet, cacheSet, TTL_CATALOG, TTL_SERVICES } from './otp-cache';
import { isActivationProduct, hasInventory } from './otp-utils';
import { calculateNavaPrice } from './pricing';
import { formatServiceDisplayName } from './otp-logos';
import { getCountryCodeFromProvider } from './country-flag';

export interface GlobalService {
  slug: string;
  displayName: string;
  totalAvailability: number;
}

export interface ServiceCountry {
  slug: string;
  displayName: string;
  countryCode: string | null;
  availability: number;
  bestPrice: number; // Wholesale
  navaPrice: number; // Retail
}

export interface OtpQuote {
  country: string;
  service: string;
  operator: string;
  supplierCost: number;
  navaPrice: number;
  availability: number;
  estimatedDelivery: string;
  isViable: boolean;
}

function formatCountrySlug(slug: string): string {
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const COUNTRY_METADATA_CACHE_KEY = 'otp:country_metadata';

async function getCachedCountryMetadata(): Promise<FiveSimCountryCatalog> {
  const cached = cacheGet<FiveSimCountryCatalog>(COUNTRY_METADATA_CACHE_KEY);
  if (cached) return cached;

  const catalog = await getCountryCatalog();
  cacheSet(COUNTRY_METADATA_CACHE_KEY, catalog, TTL_CATALOG);
  return catalog;
}

const RUB_TO_USD = 0.011;
function normalizePriceUsd(rawCost: number): number {
  if (!rawCost || rawCost <= 0) return 0;
  return Math.round(rawCost * RUB_TO_USD * 1000) / 1000;
}

function extractOperators(productData: any): Array<{ slug: string; price: number; qty: number; category: string }> {
  if (!productData || typeof productData !== 'object') return [];

  if ('cost' in productData || 'price' in productData || 'count' in productData || 'qty' in productData) {
    const rawCost = Number(productData.cost ?? productData.price ?? 0);
    const count = Number(productData.count ?? productData.qty ?? 0);
    const category = productData.category || 'activation';
    return [{ slug: 'any', price: normalizePriceUsd(rawCost), qty: count, category }];
  }

  const ops: Array<{ slug: string; price: number; qty: number; category: string }> = [];
  for (const [opSlug, opData] of Object.entries(productData)) {
    if (opData && typeof opData === 'object') {
      const data = opData as any;
      const rawCost = Number(data.cost ?? data.price ?? 0);
      const count = Number(data.count ?? data.qty ?? 0);
      const category = data.category || 'activation';
      ops.push({ slug: opSlug, price: normalizePriceUsd(rawCost), qty: count, category });
    }
  }
  return ops;
}

// ─── CORE EXPORTS (APP FIRST) ───

export async function getGlobalServices(): Promise<GlobalService[]> {
  const cacheKey = 'otp:global_services';
  const cached = cacheGet<GlobalService[]>(cacheKey);
  if (cached) return cached;

  const prices = await getAllPrices();
  const serviceMap = new Map<string, number>();

  for (const countryData of Object.values(prices)) {
    for (const [productSlug, productData] of Object.entries(countryData)) {
      const ops = extractOperators(productData);
      const validOps = ops.filter((op) => isActivationProduct(op) && hasInventory(op));
      if (validOps.length > 0) {
        const qty = validOps.reduce((sum, o) => sum + o.qty, 0);
        serviceMap.set(productSlug, (serviceMap.get(productSlug) || 0) + qty);
      }
    }
  }

  const result: GlobalService[] = Array.from(serviceMap.entries()).map(([slug, qty]) => {
    const displayName = formatServiceDisplayName(slug);
    return {
      slug,
      displayName,
      totalAvailability: qty,
    };
  });

  result.sort((a, b) => b.totalAvailability - a.totalAvailability);
  cacheSet(cacheKey, result, TTL_SERVICES);
  return result;
}

export async function getCountriesForService(serviceSlug: string): Promise<ServiceCountry[]> {
  const cacheKey = `otp:countries_for_${serviceSlug}`;
  const cached = cacheGet<ServiceCountry[]>(cacheKey);
  if (cached) return cached;

  const [prices, countryMetadata] = await Promise.all([
    getAllPrices(),
    getCachedCountryMetadata().catch((error) => {
      console.warn('[5SIM] Country metadata unavailable; rendering countries without guessed flags:', error);
      return {} as FiveSimCountryCatalog;
    }),
  ]);
  const result: ServiceCountry[] = [];

  for (const [countrySlug, countryData] of Object.entries(prices)) {
    const productData = countryData[serviceSlug];
    if (!productData) continue;

    const ops = extractOperators(productData);
    const validOps = ops.filter((op) => isActivationProduct(op) && hasInventory(op));

    if (validOps.length > 0) {
      const totalQty = validOps.reduce((sum, o) => sum + o.qty, 0);
      const bestWholesale = Math.min(...validOps.map((o) => o.price));

      const pricing = calculateNavaPrice(bestWholesale, countrySlug, serviceSlug);
      const isViable = typeof pricing === 'object' && pricing !== null ? pricing.isViable : false;
      const navaPrice = typeof pricing === 'object' && pricing !== null ? pricing.retailPriceUSD : 0;

      if (isViable) {
        const providerCountry = countryMetadata[countrySlug];
        result.push({
          slug: countrySlug,
          displayName: providerCountry?.text_en || formatCountrySlug(countrySlug),
          countryCode: getCountryCodeFromProvider(countrySlug, providerCountry?.iso),
          availability: totalQty,
          bestPrice: bestWholesale,
          navaPrice: navaPrice,
        });
      }
    }
  }

  // Default Sort: Most popular (highest availability)
  result.sort((a, b) => b.availability - a.availability);
  cacheSet(cacheKey, result, TTL_CATALOG);
  return result;
}

export async function getOtpQuote(country: string, service: string): Promise<OtpQuote | null> {
  const countries = await getCountriesForService(service);
  const target = countries.find((c) => c.slug === country);

  if (!target) return null;

  return {
    country,
    service,
    operator: 'any',
    supplierCost: target.bestPrice,
    navaPrice: target.navaPrice,
    availability: target.availability,
    estimatedDelivery: target.availability > 10 ? '< 30s' : '< 2 min',
    isViable: true,
  };
}