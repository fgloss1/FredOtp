const SERVICE_ICON_CODEPOINTS: Record<string, number[]> = {
  match: [0x1F498],
  zoosk: [0x1F4AB],
  tinder: [0x1F525],
  bumble: [0x1F41D],
  hinge: [0x1FA84],
  badoo: [0x1F49C],
  gmail: [0x2709, 0xFE0F],
  outlook: [0x1F4EE],
  yahoo: [0x1F4EC],
  paypal: [0x1F17F, 0xFE0F],
  venmo: [0x1F4B8],
  cashapp: [0x1F4B5],
  coinbase: [0x1FA99],
  binance: [0x1F7E1],
  revolut: [0x1F3E6],
  chime: [0x1F33F],
  whatsapp: [0x1F4AC],
  telegram: [0x2708, 0xFE0F],
  signal: [0x1F510],
  discord: [0x1F3AE],
  facebook: [0x1F4D8],
  instagram: [0x1F4F8],
  tiktok: [0x1F3B5],
  twitter: [0x2716, 0xFE0F],
  snapchat: [0x1F47B],
  linkedin: [0x1F4BC],
  uber: [0x1F697],
  airbnb: [0x1F3E0],
  doordash: [0x1F6F5],
  amazon: [0x1F4E6],
  netflix: [0x1F3AC],
  openai: [0x1F916],
};

export function serviceIcon(slug: string): string {
  const codePoints = SERVICE_ICON_CODEPOINTS[slug.toLowerCase()];
  return codePoints ? String.fromCodePoint(...codePoints) : String.fromCodePoint(0x1F4F1);
}

export function countryFlag(code: string): string {
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalized)) {
    return String.fromCodePoint(0x1F310);
  }

  return String.fromCodePoint(
    ...normalized.split("").map((character) => 127397 + character.charCodeAt(0)),
  );
}
