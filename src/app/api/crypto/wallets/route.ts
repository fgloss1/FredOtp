import { NextResponse } from "next/server";

export async function GET() {
  // Read from NEXT_PUBLIC_ vars since that's what's configured
  const usdtTrx = process.env.NEXT_PUBLIC_CRYPTO_USDT_TRX || "";
  const btc = process.env.NEXT_PUBLIC_CRYPTO_BTC || "";
  const ltc = process.env.NEXT_PUBLIC_CRYPTO_LTC || "";

  return NextResponse.json({
    wallets: [
      {
        coin: "USDT (TRX)",
        symbol: "USDT",
        address: usdtTrx,
        network: "Tron (TRX) Network",
        rateUSD: 1.0,
        autoCredit: true,
        icon: "https://cryptologos.cc/logos/tether-usdt-logo.svg?v=025",
      },
      {
        coin: "Bitcoin (BTC)",
        symbol: "BTC",
        address: btc,
        network: "Bitcoin Network",
        rateUSD: 85261.06,
        autoCredit: false,
        icon: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg?v=025",
      },
      {
        coin: "Litecoin (LTC)",
        symbol: "LTC",
        address: ltc,
        network: "Litecoin Network",
        rateUSD: 70.032,
        autoCredit: false,
        icon: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg?v=025",
      },
    ],
  });
}