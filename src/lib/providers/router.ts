import type { OtpProvider, ProviderOrder, ProviderQuote } from "@/lib/providers/types";
import { fiveSim } from "@/lib/providers/five-sim";

const providers: OtpProvider[] = [fiveSim];

export async function getProviderQuotes(input: {
  countryCode: string;
  serviceSlug: string;
}): Promise<ProviderQuote[]> {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.quote(input);
      } catch {
        return {
          provider: provider.name,
          available: false,
          costCents: null,
          successRate: null,
        } satisfies ProviderQuote;
      }
    }),
  );

  return results
    .filter((quote) => quote.available && quote.costCents != null)
    .sort((a, b) => (a.costCents ?? Infinity) - (b.costCents ?? Infinity));
}

export async function buyCheapestProvider(input: {
  countryCode: string;
  serviceSlug: string;
  maxCostCents?: number;
}): Promise<ProviderOrder> {
  const quotes = await getProviderQuotes(input);

  const eligible = quotes.filter(
    (quote) =>
      input.maxCostCents == null ||
      (quote.costCents != null && quote.costCents <= input.maxCostCents),
  );

  if (eligible.length === 0) {
    throw new Error("No supplier currently has an available number for this service and country.");
  }

  const provider = providers.find((item) => item.name === eligible[0].provider);
  if (!provider) throw new Error("Selected supplier is not configured.");

  const cheapestCost = eligible[0].costCents ?? undefined;

  try {
    return await provider.buy({
      countryCode: input.countryCode,
      serviceSlug: input.serviceSlug,
      maxCostCents: cheapestCost,
    });
  } catch (firstError) {
    for (const quote of eligible.slice(1)) {
      const fallback = providers.find((item) => item.name === quote.provider);
      if (!fallback) continue;

      try {
        return await fallback.buy({
          countryCode: input.countryCode,
          serviceSlug: input.serviceSlug,
          maxCostCents: quote.costCents ?? undefined,
        });
      } catch {
        // Try the next eligible supplier.
      }
    }

    throw firstError;
  }
}

export function getProvider(name: string): OtpProvider {
  const provider = providers.find((item) => item.name === name);
  if (!provider) throw new Error(`Unsupported supplier: ${name}`);
  return provider;
}
