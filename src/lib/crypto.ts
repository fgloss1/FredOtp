export interface CryptoWalletConfig {
  coin: string;
  network: string;
  symbol: string;
  address: string;
  qr: string;
  icon: string;
  explorer: string;
}

export const getCryptoWallets = (): CryptoWalletConfig[] => {
  // NEXT_PUBLIC_ is required for browser/client-side access in Next.js
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
    },
    {
      coin: "Bitcoin (BTC)",
      network: "Bitcoin Network",
      symbol: "BTC",
      address: btc,
      qr: btc ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(btc)}` : "",
      icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=025",
      explorer: "https://www.blockchain.com/explorer/transactions/btc/",
    },
    {
      coin: "Litecoin (LTC)",
      network: "Litecoin Network",
      symbol: "LTC",
      address: ltc,
      qr: ltc ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ltc)}` : "",
      icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=025",
      explorer: "https://blockchair.com/litecoin/transaction/",
    },
  ];
};