import type { OtpProvider, ProviderOrder, ProviderQuote } from "@/lib/providers/types";
import { fiveSim } from "@/lib/providers/five-sim";
import { smsMan } from "@/lib/providers/sms-man";

const providers: OtpProvider[] = [fiveSim, smsMan];

export async function getProviderQuotes(input: {
  countryCode: string;
  serviceSlug: string;
}): Promise<ProviderQuote[]> {
  const errors: string[] = [];

  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await provider.quote(input);
      } catch (error) {
        if (error instanceof Error && error.message) {
          errors.push(`${provider.name}: ${error.message}`);
        } else {
          errors.push(`${provider.name}: supplier request failed`);
        }

        return {
          provider: provider.name,
          available: false,
          costCents: null,
          successRate: null,
        } satisfies ProviderQuote;
      }
    }),
  );

  const quotes = results
    .filter((quote) => quote.available && quote.costCents != null)
    .sort((a, b) => (a.costCents ?? Infinity) - (b.costCents ?? Infinity));

  if (quotes.length === 0 && errors.length > 0) {
    throw new Error(`Supplier checks failed: ${errors.join("; ")}`);
  }

  return quotes;
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

  let lastError: unknown = null;

  for (const quote of eligible) {
    const provider = providers.find((item) => item.name === quote.provider);
    if (!provider) continue;

    try {
      return await provider.buy({
        countryCode: input.countryCode,
        serviceSlug: input.serviceSlug,
        maxCostCents: quote.costCents ?? undefined,
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("All eligible OTP suppliers failed to provide a number.");
}

export function getProvider(name: string): OtpProvider {
  const provider = providers.find((item) => item.name === name);
  if (!provider) throw new Error(`Unsupported supplier: ${name}`);
  return provider;
}
