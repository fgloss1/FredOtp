const DEFAULT_PROVIDER_MARKUP_BPS = 1500;
const PRICE_STEP_CENTS = 5;

function providerMarkupBps(): number {
  const value = Number(process.env.OTP_PROVIDER_MARKUP_BPS);
  if (!Number.isFinite(value) || value < 0) return DEFAULT_PROVIDER_MARKUP_BPS;
  return Math.round(value);
}

export function customerPriceForProviderCost(
  providerCostCents: number,
  catalogFloorCents: number,
): number {
  const cost = Math.max(0, Math.round(providerCostCents));
  const floor = Math.max(0, Math.round(catalogFloorCents));
  const withMarkup = Math.ceil((cost * (10_000 + providerMarkupBps())) / 10_000);
  const stepped = Math.ceil(withMarkup / PRICE_STEP_CENTS) * PRICE_STEP_CENTS;
  return Math.max(floor, stepped);
}
