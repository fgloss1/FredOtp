/**
 * NAVA OTP Logo Engine
 * Maps 5SIM service slugs & shortcodes to official multi-color brand vector assets & domains.
 */

export const GENERIC_FALLBACK_ICON =
  'data:image/svg+xml;base64,' +
  (typeof Buffer !== 'undefined'
    ? Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>'
      ).toString('base64')
    : btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#9ca3af"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>'
      ));

/**
 * High-Definition Multi-Color Official Vector Assets for Top Apps
 */
const OFFICIAL_BRAND_SVGS: Record<string, string> = {
  whatsapp: 'logos/whatsapp-icon',
  wa: 'logos/whatsapp-icon',
  telegram: 'logos/telegram',
  tg: 'logos/telegram',
  google: 'logos/google-icon',
  go: 'logos/google-icon',
  googlevoice: 'https://cdn.simpleicons.org/googlevoice/34A853',
  gmail: 'logos/google-gmail',
  youtube: 'logos/youtube-icon',
  openai: 'logos/openai-icon',
  oa: 'logos/openai-icon',
  chatgpt: 'logos/openai-icon',
  instagram: 'logos/instagram-icon',
  ig: 'logos/instagram-icon',
  facebook: 'logos/facebook',
  fb: 'logos/facebook',
  messenger: 'logos/facebook-messenger',
  tiktok: 'logos/tiktok-icon',
  tt: 'logos/tiktok-icon',
  lf: 'logos/tiktok-icon',
  paypal: 'logos/paypal',
  py: 'logos/paypal',
  discord: 'logos/discord-icon',
  ds: 'logos/discord-icon',
  spotify: 'logos/spotify',
  sp: 'logos/spotify',
  netflix: 'logos/netflix-icon',
  nf: 'logos/netflix-icon',
  twitter: 'logos/twitter',
  x: 'logos/twitter',
  tw: 'logos/twitter',
  tinder: 'logos/tinder-icon',
  ts: 'logos/tinder-icon',
  binance: 'logos/binance',
  viber: 'logos/viber',
  vi: 'logos/viber',
  skype: 'logos/skype',
  steam: 'logos/steam',
  st: 'logos/steam',
  twitch: 'logos/twitch',
  airbnb: 'logos/airbnb-icon',
  ab: 'logos/airbnb-icon',
  match: 'https://cdn.simpleicons.org/match/E6007E',
  cashapp: 'https://cdn.simpleicons.org/cashapp/00D632',
  'cash.app': 'https://cdn.simpleicons.org/cashapp/00D632',
};

const SLUG_TO_DOMAIN: Record<string, string> = {
  // Shortcodes & 5SIM Aliases
  wa: 'whatsapp.com',
  whatsapp: 'whatsapp.com',
  tg: 'telegram.org',
  telegram: 'telegram.org',
  signal: 'signal.org',
  ig: 'instagram.com',
  instagram: 'instagram.com',
  fb: 'facebook.com',
  facebook: 'facebook.com',
  messenger: 'messenger.com',
  tt: 'tiktok.com',
  lf: 'tiktok.com',
  tiktok: 'tiktok.com',
  tw: 'x.com',
  twitter: 'x.com',
  x: 'x.com',
  go: 'google.com',
  google: 'google.com',
  googlevoice: 'voice.google.com',
  gmail: 'gmail.com',
  youtube: 'youtube.com',
  ds: 'discord.com',
  discord: 'discord.com',
  sn: 'snapchat.com',
  snapchat: 'snapchat.com',
  nf: 'netflix.com',
  netflix: 'netflix.com',
  sp: 'spotify.com',
  spotify: 'spotify.com',
  py: 'paypal.com',
  paypal: 'paypal.com',
  ub: 'uber.com',
  uber: 'uber.com',
  ts: 'tinder.com',
  tinder: 'tinder.com',
  match: 'match.com',
  linkedin: 'linkedin.com',
  wechat: 'wechat.com',
  line: 'line.me',
  vi: 'viber.com',
  viber: 'viber.com',
  microsoft: 'microsoft.com',
  ap: 'apple.com',
  apple: 'apple.com',
  am: 'amazon.com',
  amazon: 'amazon.com',
  st: 'steampowered.com',
  steam: 'steampowered.com',
  twitch: 'twitch.tv',
  ab: 'airbnb.com',
  airbnb: 'airbnb.com',
  nike: 'nike.com',
  adidas: 'adidas.com',
  binance: 'binance.com',
  coinbase: 'coinbase.com',
  oa: 'openai.com',
  openai: 'openai.com',
  chatgpt: 'openai.com',
  claude: 'anthropic.com',
  zoom: 'zoom.us',
  skype: 'skype.com',
  ebay: 'ebay.com',
  kakao: 'kakaocorp.com',
  kakaotalk: 'kakaocorp.com',
  bigolive: 'bigo.tv',
  bumble: 'bumble.com',
  foodpanda: 'foodpanda.com',
  huya: 'huya.com',
  naver: 'naver.com',
  blizard: 'blizzard.com',
  blizzard: 'blizzard.com',
  alibaba: 'alibaba.com',
  alipay: 'alipay.com',
  lazada: 'lazada.com',
  shopee: 'shopee.com',
  tokopedia: 'tokopedia.com',
  gojek: 'gojek.com',
  grab: 'grab.com',
  bolt: 'bolt.eu',
  glovo: 'glovoapp.com',
  wolt: 'wolt.com',
  yandex: 'yandex.com',
  vk: 'vk.com',
  mailru: 'mail.ru',
  mail_ru: 'mail.ru',
  ok: 'ok.ru',
  ok_ru: 'ok.ru',
  imo: 'imo.im',
  clubhouse: 'clubhouse.com',
  hinge: 'hinge.co',
  redbook: 'xiaohongshu.com',
  xiaohongshu: 'xiaohongshu.com',
  noon: 'noon.com',
  leboncoin: 'leboncoin.fr',
  mc: 'mcdonalds.com',
  mcdonalds: 'mcdonalds.com',
  kfc: 'kfc.com',
  starbucks: 'starbucks.com',
  deliveryclub: 'delivery-club.ru',
  delivery_club: 'delivery-club.ru',
  wildberries: 'wildberries.ru',
  ozon: 'ozon.ru',
  avito: 'avito.ru',
  crypto_com: 'crypto.com',
  kucoin: 'kucoin.com',
  bybit: 'bybit.com',
  okx: 'okx.com',
  huobi: 'htx.com',
  kraken: 'kraken.com',
  bitget: 'bitget.com',
  fiverr: 'fiverr.com',
  upwork: 'upwork.com',
  freelancer: 'freelancer.com',
  bet365: 'bet365.com',
  getir: 'getir.com',
  nttgame: 'nttgame.com',
  hily: 'hily.com',
  ubisoft: 'ubisoft.com',
  tango: 'tango.me',
  yahoo: 'yahoo.com',
  craigslist: 'craigslist.org',
  papara: 'papara.com',
  deliveroo: 'deliveroo.co.uk',
  baidu: 'baidu.com',

  // Finance & Payment Additions
  cash: 'cash.app',
  cashapp: 'cash.app',
  'cash.app': 'cash.app',
  cash_app: 'cash.app',
  revolut: 'revolut.com',
  wise: 'wise.com',
  stripe: 'stripe.com',
  zelle: 'zellepay.com',
  remitly: 'remitly.com',
  venmo: 'venmo.com',
  kick: 'kick.com',
};

export function getOfficialBrandIcon(slug: string): string | null {
  const clean = (slug || '').toLowerCase().trim();
  return OFFICIAL_BRAND_SVGS[clean] || OFFICIAL_BRAND_SVGS[clean.replace(/_/g, '')] || null;
}

export function getDomainForSlug(slug: string): string | null {
  const clean = (slug || '').toLowerCase().trim();
  if (SLUG_TO_DOMAIN[clean]) return SLUG_TO_DOMAIN[clean];
  if (SLUG_TO_DOMAIN[clean.replace(/_/g, '')]) return SLUG_TO_DOMAIN[clean.replace(/_/g, '')];
  return clean.includes('.') ? clean : `${clean}.com`;
}

export function getServiceLogo(serviceName: string, serviceSlug: string): string {
  const cleanSlug = (serviceSlug || '').toLowerCase().trim();
  const cleanName = serviceName || formatServiceDisplayName(serviceSlug);
  return `/api/otp/logo?slug=${encodeURIComponent(cleanSlug)}&name=${encodeURIComponent(cleanName)}&v=3`;
}

export function formatServiceDisplayName(slug: string): string {
  const overrides: Record<string, string> = {
    wa: 'WhatsApp',
    whatsapp: 'WhatsApp',
    tg: 'Telegram',
    telegram: 'Telegram',
    go: 'Google / YouTube',
    google: 'Google / YouTube',
    googlevoice: 'Google Voice',
    youtube: 'YouTube',
    py: 'PayPal',
    paypal: 'PayPal',
    tt: 'TikTok',
    lf: 'TikTok',
    tiktok: 'TikTok',
    wechat: 'WeChat',
    linkedin: 'LinkedIn',
    oa: 'OpenAI',
    openai: 'OpenAI',
    chatgpt: 'ChatGPT',
    kakaotalk: 'KakaoTalk',
    bigolive: 'BIGO Live',
    foodpanda: 'foodpanda',
    mail_ru: 'Mail.ru',
    ok_ru: 'OK.ru',
    hepsiburadacom: 'Hepsiburada',
    tencentqq: 'QQ',
    leboncoin: 'Leboncoin',
    crypto_com: 'Crypto.com',
    yahoo: 'Yahoo',
    amazon: 'Amazon',
    ub: 'Uber',
    uber: 'Uber',
    craigslist: 'Craigslist',
    papara: 'Papara',
    deliveroo: 'Deliveroo',
    baidu: 'Baidu',
    match: 'Match',
    cashapp: 'Cash App',
    'cash.app': 'Cash App',
    cash_app: 'Cash App',
  };

  const clean = (slug || '').toLowerCase();
  if (overrides[clean]) return overrides[clean];

  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
/**
 * Compatibility resolver used by /api/otp/logo.
 *
 * Returns a normalized Simple Icons slug.
 * This does not change the existing logo handlers.
 */
export function getIconAlias(serviceSlug: string): string {
  const clean = (serviceSlug || "")
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

  const aliases: Record<string, string> = {
    whatsapp: "whatsapp",
    telegram: "telegram",
    instagram: "instagram",
    facebook: "facebook",
    messenger: "messenger",
    tiktok: "tiktok",
    twitter: "x",
    x: "x",
    google: "google",
    gmail: "gmail",
    apple: "apple",
    amazon: "amazon",
    paypal: "paypal",
    discord: "discord",
    snapchat: "snapchat",
    spotify: "spotify",
    netflix: "netflix",
    uber: "uber",
    tinder: "tinder",
    linkedin: "linkedin",
    telegramapp: "telegram",
    chatgpt: "openai",
    openai: "openai",
    signal: "signal",
    viber: "viber",
    line: "line",
    skype: "skype",
    zoom: "zoom",
    reddit: "reddit",
    pinterest: "pinterest",
    slack: "slack",
    ebay: "ebay",
    binance: "binance",
    coinbase: "coinbase",
    bybit: "bybit",
    okx: "okx",
    kucoin: "kucoin",
  };

  return aliases[clean] || clean;
}