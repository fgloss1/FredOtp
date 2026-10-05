export interface CryptoWalletConfig {
  coin: string;
  network: string;
  symbol: string;
  address: string;
  qr: string;
  icon: string;
  explorer: string;
  rateUSD: number; // Static exchange rate (1 crypto = X USD)
}

// STATIC EXCHANGE RATES (Update manually as needed)
// These rates are displayed to customers so they know the calculation
export const CRYPTO_RATES = {
  USDT: 1.00,        // 1 USDT = $1.00 USD (stablecoin)
  BTC: 85261.06,     // 1 BTC = $85,261.06 USD (update manually)
  LTC: 70.032,       // 1 LTC = $70.032 USD (update manually)
};

// ⚠️ DEPRECATED: getCryptoWallets() is no longer used.
// Crypto wallet addresses are now server-authoritative for security.
// Client should fetch from /api/crypto/wallets endpoint instead.
// This function is kept for backward compatibility but should not be used.
export const getCryptoWallets = (): CryptoWalletConfig[] => {
  const usdtTrx = process.env.NEXT_PUBLIC_CRYPTO_USDT_TRX || "";
  const btc = process.env.NEXT_PUBLIC_CRYPTO_BTC || "";
  const ltc = process.env.NEXT_PUBLIC_CRYPTO_LTC || "";

  return [
    {
      coin: "USDT (TRX)",
      network: "Tron (TRX) Network",
      symbol: "USDT",
      address: usdtTrx,
      qr: usdtTrx ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(usdtTrx)}` : "",
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=025",
      explorer: "https://tronscan.org/#/transaction/",
      rateUSD: CRYPTO_RATES.USDT,
    },
    {
      coin: "Bitcoin (BTC)",
      network: "Bitcoin Network",
      symbol: "BTC",
      address: btc,
      qr: btc ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(btc)}` : "",
      icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=025",
      explorer: "https://www.blockchain.com/explorer/transactions/btc/",
      rateUSD: CRYPTO_RATES.BTC,
    },
    {
      coin: "Litecoin (LTC)",
      network: "Litecoin Network",
      symbol: "LTC",
      address: ltc,
      qr: ltc ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ltc)}` : "",
      icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=025",
      explorer: "https://blockchair.com/litecoin/transaction/",
      rateUSD: CRYPTO_RATES.LTC,
    },
  ];
};

// Helper: Calculate crypto amount from USD
export const calculateCryptoAmount = (usdAmount: number, rateUSD: number): number => {
  if (rateUSD <= 0) return 0;
  return Number((usdAmount / rateUSD).toFixed(8));
};

// Helper: Format crypto amount with appropriate decimals
export const formatCryptoAmount = (amount: number, symbol: string): string => {
  if (symbol === "USDT") return amount.toFixed(2);
  if (symbol === "BTC") return amount.toFixed(8);
  if (symbol === "LTC") return amount.toFixed(6);
  return amount.toFixed(4);
};