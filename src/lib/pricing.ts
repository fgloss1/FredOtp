/**
 * NAVA Tiered OTP Pricing Engine
 *
 * Flow: Live Provider Cost -> Tiered Markup Rule -> Round UP to $0.05 -> Final Customer Retail Price
 * Optional Market Benchmark (SMSBulk / TextVerified) can be supplied for reference comparison.
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
  minRetailFloorUSD: 0.50,
  roundToStepUSD: 0.05,
};

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
  if (supplierCostUSD <= 0) {
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

  // Find matching tier
  const tier = config.tiers.find((t) => supplierCostUSD <= t.maxCostUSD) || config.tiers[config.tiers.length - 1];
  const rawMarkedUpPrice = supplierCostUSD * (1 + tier.markupPercent);

  // Apply minimum retail floor
  const priceBeforeRounding = Math.max(rawMarkedUpPrice, config.minRetailFloorUSD);

  // Round UP to the next $0.05
  const finalRetailPrice = roundUpToStep(priceBeforeRounding, config.roundToStepUSD);

  // Calculate margins
  const marginUSD = Number((finalRetailPrice - supplierCostUSD).toFixed(2));
  const marginPercent = Number(((marginUSD / finalRetailPrice) * 100).toFixed(1));

  // Check optional benchmark for reference comparison
  const benchmarkKey = `${countryCode.toLowerCase()}:${serviceSlug.toLowerCase()}`;
  const benchmark = MARKET_BENCHMARKS[benchmarkKey];

  // Viability check: Never sell at loss or zero margin
  const isViable = marginUSD > 0 && finalRetailPrice > supplierCostUSD;

  return {
    supplierCostUSD,
    retailPriceUSD: finalRetailPrice,
    marginUSD,
    marginPercent,
    appliedTierMarkupPercent: tier.markupPercent * 100,
    marketBenchmark: benchmark,
    isViable,
    unviableReason: isViable ? undefined : "Unviable pricing margin",
  };
}