export type ProviderQuote = {
  provider: string;
  available: boolean;
  costCents: number | null;
  successRate: number | null;
};

export type ProviderOrder = {
  provider: string;
  orderId: string;
  phoneNumber: string;
  costCents: number;
  currency: string;
  status: string;
};

export type ProviderSms = {
  code: string | null;
  text: string | null;
};

export interface OtpProvider {
  readonly name: string;
  quote(input: { countryCode: string; serviceSlug: string }): Promise<ProviderQuote>;
  buy(input: { countryCode: string; serviceSlug: string; maxCostCents?: number }): Promise<ProviderOrder>;
  check(orderId: string): Promise<{ status: string; sms: ProviderSms | null }>;
  cancel(orderId: string): Promise<void>;
  finish?(orderId: string): Promise<void>;
}
