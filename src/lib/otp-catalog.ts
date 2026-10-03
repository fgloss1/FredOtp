/**
 * NAVA OTP Catalog Normalization Service
 * Supports App-First UX: Fetches global services, sorts countries by price.
 */

import { getAllPrices } from './5sim';
import { cacheGet, cacheSet, TTL_CATALOG, TTL_SERVICES } from './otp-cache';
import { isActivationProduct, hasInventory } from './otp-utils';
import { calculateNavaPrice } from './pricing';
import { getServiceLogo, formatServiceDisplayName } from './otp-logos';

export interface GlobalService {
  slug: string;
  displayName: string;
  logoUrl: string;
  totalAvailability: number;
}

export interface ServiceCountry {
  slug: string;
  displayName: string;
  flagEmoji: string;
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

// ─── MASSIVE ISO MAP FOR FLAG EMOJIS ───
const SLUG_TO_ISO: Record<string, string> = {
  usa: 'us', us: 'us', uk: 'gb', england: 'gb', gb: 'gb', canada: 'ca',
  nigeria: 'ng', ghana: 'gh', kenya: 'ke', south_africa: 'za', southafrica: 'za',
  germany: 'de', france: 'fr', brazil: 'br', india: 'in', russia: 'ru',
  indonesia: 'id', philippines: 'ph', vietnam: 'vn', mexico: 'mx',
  spain: 'es', italy: 'it', netherlands: 'nl', poland: 'pl', turkey: 'tr',
  egypt: 'eg', colombia: 'co', argentina: 'ar', thailand: 'th', malaysia: 'my',
  hongkong: 'hk', hong_kong: 'hk', morocco: 'ma', sweden: 'se', switzerland: 'ch',
  australia: 'au', japan: 'jp', china: 'cn', south_korea: 'kr', korea: 'kr',
  uae: 'ae', saudi: 'sa', pakistan: 'pk', bangladesh: 'bd', singapore: 'sg',
  chile: 'cl', peru: 'pe', ukraine: 'ua', czech: 'cz', czechia: 'cz',
  romania: 'ro', hungary: 'hu', greece: 'gr', israel: 'il', portugal: 'pt',
  ireland: 'ie', austria: 'at', belgium: 'be', denmark: 'dk', finland: 'fi',
  norway: 'no', georgia: 'ge', taiwan: 'tw', macau: 'mo', estonia: 'ee',
  lithuania: 'lt', latvia: 'lv', kazakhstan: 'kz', uzbekistan: 'uz',
  kyrgyzstan: 'kg', tajikistan: 'tj', cambodia: 'kh', mongolia: 'mn',
  nepal: 'np', myanmar: 'mm', sri_lanka: 'lk', maldives: 'mv', afghanistan: 'af',
  iran: 'ir', iraq: 'iq', syria: 'sy', jordan: 'jo', lebanon: 'lb',
  yemen: 'ye', oman: 'om', qatar: 'qa', kuwait: 'kw', bahrain: 'bh',
  cyprus: 'cy', malta: 'mt', iceland: 'is', luxembourg: 'lu', croatia: 'hr',
  slovenia: 'si', slovakia: 'sk', bulgaria: 'bg', serbia: 'rs', bosnia: 'ba',
  montenegro: 'me', albania: 'al', macedonia: 'mk', moldova: 'md', belarus: 'by',
  armenia: 'am', azerbaijan: 'az', angola: 'ao', cameroon: 'cm', senegal: 'sn',
  ivory_coast: 'ci', mali: 'ml', guinea: 'gn', sierra_leone: 'sl', liberia: 'lr',
  burkina_faso: 'bf', togo: 'tg', benin: 'bj', niger: 'ne', chad: 'td',
  mauritania: 'mr', sudan: 'sd', ethiopia: 'et', somalia: 'so', djibouti: 'dj',
  uganda: 'ug', rwanda: 'rw', burundi: 'bi', tanzania: 'tz', zambia: 'zm',
  malawi: 'mw', mozambique: 'mz', zimbabwe: 'zw', botswana: 'bw', namibia: 'na',
  lesotho: 'ls', swaziland: 'sz', madagascar: 'mg', mauritius: 'mu',
  seychelles: 'sc', congo: 'cg', gabon: 'ga', gambia: 'gm', equatorial_guinea: 'gq',
  sao_tome: 'st', central_african: 'cf', venezuela: 've', guyana: 'gy',
  suriname: 'sr', ecuador: 'ec', bolivia: 'bo', paraguay: 'py', uruguay: 'uy',
  panama: 'pa', cuba: 'cu', dominican: 'do', haiti: 'ht', jamaica: 'jm',
  puerto_rico: 'pr', trinidad: 'tt', bahamas: 'bs', barbados: 'bb', belize: 'bz',
  guatemala: 'gt', honduras: 'hn', el_salvador: 'sv', nicaragua: 'ni',
  costa_rica: 'cr', fiji: 'fj', papua: 'pg', solomon: 'sb', vanuatu: 'vu',
  samoa: 'ws', tonga: 'to'
};

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  england: 'United Kingdom', uk: 'United Kingdom', usa: 'United States', us: 'United States',
  hongkong: 'Hong Kong', south_africa: 'South Africa', south_korea: 'South Korea',
  czech: 'Czech Republic', uae: 'United Arab Emirates', saudi: 'Saudi Arabia',
  new_zealand: 'New Zealand', costa_rica: 'Costa Rica', puerto_rico: 'Puerto Rico',
  dominican: 'Dominican Republic', ivory_coast: 'Ivory Coast'
};

// ─── HELPERS ───

function getFlagEmoji(slug: string): string {
  const cleanSlug = slug.toLowerCase().trim().replace(/_/g, '');
  const iso = SLUG_TO_ISO[slug.toLowerCase().trim()] || SLUG_TO_ISO[cleanSlug] || (cleanSlug.length === 2 ? cleanSlug : null);
  if (!iso) return '🌐';
  const codePoints = iso.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatCountrySlug(slug: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  const compact = cleanSlug.replace(/_/g, '');
  if (DISPLAY_NAME_OVERRIDES[cleanSlug]) return DISPLAY_NAME_OVERRIDES[cleanSlug];
  if (DISPLAY_NAME_OVERRIDES[compact]) return DISPLAY_NAME_OVERRIDES[compact];
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
      logoUrl: getServiceLogo(displayName, slug),
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

  const prices = await getAllPrices();
  const result: ServiceCountry[] = [];

  for (const [countrySlug, countryData] of Object.entries(prices)) {
    const productData = countryData[serviceSlug];
    if (!productData) continue;

    const ops = extractOperators(productData);
    const validOps = ops.filter((op) => isActivationProduct(op) && hasInventory(op));

    if (validOps.length > 0) {
      const totalQty = validOps.reduce((sum, o) => sum + o.qty, 0);
      const bestWholesale = Math.min(...validOps.map((o) => o.price));

      const pricing = calculateNavaPrice(bestWholesale, serviceSlug, countrySlug);
      const isViable = typeof pricing === 'object' && pricing !== null ? pricing.isViable : false;
      const navaPrice = typeof pricing === 'object' && pricing !== null ? pricing.retailPriceUSD : 0;

      if (isViable) {
        result.push({
          slug: countrySlug,
          displayName: formatCountrySlug(countrySlug),
          flagEmoji: getFlagEmoji(countrySlug),
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