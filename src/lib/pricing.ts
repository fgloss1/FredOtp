/**
 * NAVA Dynamic OTP Pricing Engine
 *
 * Flow: Live Provider Cost -> App & Region Rules -> Tiered Markup Rule -> Round UP to $0.05 -> Customer Retail Price
 */

export interface MarketBenchmark {
  source: string;
  priceUSD: number;
  timestamp: string;
}

export interface PricingTier {
  maxCostUSD: number; // Upper bound for cost (inclusive)
  markupPercent: number; // e.g., 0.70 = 70%
}

export interface TieredPricingConfig {
  tiers: PricingTier[];
  minRetailFloorUSD: number;
  roundToStepUSD: number; // e.g. 0.05
}

// Configurable pricing tiers and floor
export const DEFAULT_TIERED_CONFIG: TieredPricingConfig = {
  tiers: [
    { maxCostUSD: 0.50, markupPercent: 0.70 }, // <= $0.50 -> 70%
    { maxCostUSD: 1.00, markupPercent: 0.50 }, // $0.51 - $1.00 -> 50%
    { maxCostUSD: 2.00, markupPercent: 0.40 }, // $1.01 - $2.00 -> 40%
    { maxCostUSD: Infinity, markupPercent: 0.30 }, // > $2.00 -> 30%
  ],
  minRetailFloorUSD: 0.40, // Base floor lowered to $0.40 for cheap apps
  roundToStepUSD: 0.05,
};

// High Demand Service Slugs
const WHATSAPP_SLUGS = ['whatsapp', 'wa'];
const TOP_APP_SLUGS = [
  'telegram', 'tg',
  'openai', 'oa', 'chatgpt',
  'googlevoice',
  'tinder', 'ts',
  'cashapp', 'cash.app', 'cash'
];

// Country Tiers for High Demand Pricing
const TOP_TIER_COUNTRIES = ['us', 'usa', 'gb', 'uk', 'england', 'ca', 'canada', 'au', 'australia'];
const HIGH_DEMAND_COUNTRIES = [
  ...TOP_TIER_COUNTRIES,
  'de', 'germany', 'nl', 'netherlands', 'fr', 'france', 'ng', 'nigeria', 'ke', 'kenya'
];

// Competitor Market References (Reference Data Only - NEVER Supplier Cost)
export const MARKET_BENCHMARKS: Record<string, MarketBenchmark> = {
  "us:whatsapp": {
    source: "SMSBulk Reference",
    priceUSD: 3.00,
    timestamp: "2025-02-15T00:00:00.000Z",
  },
  "us:openai": {
    source: "SMSBulk Reference",
    priceUSD: 3.50,
    timestamp: "2025-02-15T00:00:00.000Z",
  },
  "us:telegram": {
    source: "SMSBulk Reference",
    priceUSD: 2.50,
    timestamp: "2025-02-15T00:00:00.000Z",
  },
  "gb:whatsapp": {
    source: "SMSBulk Reference",
    priceUSD: 2.80,
    timestamp: "2025-02-15T00:00:00.000Z",
  },
};

export interface CalculatePriceResult {
  supplierCostUSD: number;
  retailPriceUSD: number;
  marginUSD: number;
  marginPercent: number;
  appliedTierMarkupPercent: number;
  marketBenchmark?: MarketBenchmark;
  isViable: boolean;
  unviableReason?: string;
}

/**
 * Rounds a number UP to the nearest step (e.g. $0.05)
 */
export function roundUpToStep(amount: number, step: number = 0.05): number {
  if (amount <= 0) return 0;
  const inv = 1 / step;
  const rounded = Math.ceil(Math.round(amount * 10000) / 10000 * inv) / inv;
  return Number(rounded.toFixed(2));
}

/**
 * Single source of truth for NAVA customer pricing.
 */
export function calculateNavaPrice(
  supplierCostUSD: number,
  serviceSlug: string = "",
  countryCode: string = "",
  config: TieredPricingConfig = DEFAULT_TIERED_CONFIG
): CalculatePriceResult {
  if (!supplierCostUSD || supplierCostUSD <= 0) {
    return {
      supplierCostUSD: 0,
      retailPriceUSD: 0,
      marginUSD: 0,
      marginPercent: 0,
      appliedTierMarkupPercent: 0,
      isViable: false,
      unviableReason: "Invalid or zero provider cost",
    };
  }

  const s = (serviceSlug || '').toLowerCase().trim();
  const c = (countryCode || '').toLowerCase().trim();

  // 1. Determine Base Tier Markup
  const tier = config.tiers.find((t) => supplierCostUSD <= t.maxCostUSD) || config.tiers[config.tiers.length - 1];
  let effectiveMarkup = tier.markupPercent;

  // 2. App & Region Specific Custom Rules
  let customFloor = config.minRetailFloorUSD || 0.40;

  const isWhatsApp = WHATSAPP_SLUGS.includes(s);
  const isTopApp = TOP_APP_SLUGS.includes(s);
  const isTopCountry = TOP_TIER_COUNTRIES.includes(c);
  const isHighDemandCountry = HIGH_DEMAND_COUNTRIES.includes(c);

  if (isWhatsApp) {
    // WhatsApp gets minimum 120% markup (2.2x cost multiplier)
    effectiveMarkup = Math.max(effectiveMarkup, 1.20);

    if (isTopCountry) {
      customFloor = 2.00; // $2.00 for USA, UK, AU, CA WhatsApp
    } else {
      customFloor = 1.25; // $1.25 minimum for budget WhatsApp (beats NeuraOTP $1.53)
    }
  } else if (isTopApp) {
    effectiveMarkup = Math.max(effectiveMarkup, 0.80); // 80% minimum markup

    if (isTopCountry) {
      customFloor = 1.00; // $1.00 floor for top apps in US/UK/AU/CA
    } else {
      customFloor = 0.75; // $0.75 floor for top apps in other countries
    }
  } else if (isHighDemandCountry) {
    customFloor = Math.max(customFloor, 0.50);
  }

  // 3. Compute marked-up price before floor and rounding
  const rawMarkedUpPrice = supplierCostUSD * (1 + effectiveMarkup);
  const priceBeforeRounding = Math.max(rawMarkedUpPrice, customFloor);

  // 4. Round UP to the next $0.05
  const finalRetailPrice = roundUpToStep(priceBeforeRounding, config.roundToStepUSD || 0.05);

  // 5. Compute Profit Margins
  const marginUSD = Number((finalRetailPrice - supplierCostUSD).toFixed(2));
  const marginPercent = Number(((marginUSD / finalRetailPrice) * 100).toFixed(1));

  // 6. Optional Competitor Benchmark
  const benchmarkKey = `${c}:${s}`;
  const benchmark = MARKET_BENCHMARKS[benchmarkKey];

  // 7. Viability Check
  const isViable = marginUSD > 0 && finalRetailPrice > supplierCostUSD;

  return {
    supplierCostUSD,
    retailPriceUSD: finalRetailPrice,
    marginUSD,
    marginPercent,
    appliedTierMarkupPercent: Number((effectiveMarkup * 100).toFixed(1)),
    marketBenchmark: benchmark,
    isViable,
    unviableReason: isViable ? undefined : "Unviable pricing margin",
  };
}