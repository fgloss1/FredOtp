import { calculateNavaPrice, roundUpToStep, DEFAULT_TIERED_CONFIG } from "./pricing";

describe("NAVA Tiered OTP Pricing Engine", () => {
  test("rounds UP to the next $0.05 correctly", () => {
    expect(roundUpToStep(1.275, 0.05)).toBe(1.30);
    expect(roundUpToStep(1.21, 0.05)).toBe(1.25);
    expect(roundUpToStep(1.25, 0.05)).toBe(1.25);
    expect(roundUpToStep(0.32, 0.05)).toBe(0.35);
  });

  test("verified USA WhatsApp example ($0.85 cost -> $1.30 retail)", () => {
    const result = calculateNavaPrice(0.85, "whatsapp", "us");

    expect(result.supplierCostUSD).toBe(0.85);
    expect(result.appliedTierMarkupPercent).toBe(50); // Tier $0.51 - $1.00 -> 50%
    // $0.85 * 1.50 = $1.275 -> rounded UP to next $0.05 = $1.30
    expect(result.retailPriceUSD).toBe(1.30);
    expect(result.marginUSD).toBe(0.45);
    expect(result.isViable).toBe(true);
  });

  test("tier 1: cost <= $0.50 -> 70% markup", () => {
    const result = calculateNavaPrice(0.30, "google", "us");

    expect(result.appliedTierMarkupPercent).toBe(70);
    // $0.30 * 1.70 = $0.51 -> rounded UP to next $0.05 = $0.55
    expect(result.retailPriceUSD).toBe(0.55);
  });

  test("tier 3: cost $1.01 - $2.00 -> 40% markup", () => {
    const result = calculateNavaPrice(1.50, "openai", "us");

    expect(result.appliedTierMarkupPercent).toBe(40);
    // $1.50 * 1.40 = $2.10 -> rounded UP to next $0.05 = $2.10
    expect(result.retailPriceUSD).toBe(2.10);
  });

  test("tier 4: cost > $2.00 -> 30% markup", () => {
    const result = calculateNavaPrice(3.00, "uber", "us");

    expect(result.appliedTierMarkupPercent).toBe(30);
    // $3.00 * 1.30 = $3.90 -> rounded UP to next $0.05 = $3.90
    expect(result.retailPriceUSD).toBe(3.90);
  });

  test("never sells below provider cost", () => {
    const result = calculateNavaPrice(0.10, "test", "us");
    expect(result.retailPriceUSD).toBeGreaterThan(0.10);
    expect(result.marginUSD).toBeGreaterThan(0);
  });
});