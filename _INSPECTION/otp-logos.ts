/**
 * NAVA OTP Logo Engine
 * Strictly uses Simple Icons (SVG) for reliable brand logos.
 * No arbitrary image scraping or favicons.
 */

/**
 * A clean, generic chat-bubble icon for services with no known brand logo.
 * Encoded as a Base64 SVG to prevent network requests for fallbacks.
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
 * Explicit Alias Map: 5SIM Slug -> Simple Icons Slug
 * Handles known naming differences (e.g., chatgpt -> openai, twitter -> x).
 */
const ALIAS_MAP: Record<string, string> = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  signal: 'signal',
  instagram: 'instagram',
  facebook: 'facebook',
  messenger: 'facebook',
  tiktok: 'tiktok',
  twitter: 'x',
  x: 'x',
  google: 'google',
  gmail: 'gmail',
  youtube: 'youtube',
  discord: 'discord',
  snapchat: 'snapchat',
  netflix: 'netflix',
  spotify: 'spotify',
  paypal: 'paypal',
  uber: 'uber',
  tinder: 'tinder',
  linkedin: 'linkedin',
  wechat: 'wechat',
  line: 'line',
  viber: 'viber',
  microsoft: 'microsoft',
  apple: 'apple',
  amazon: 'amazon',
  steam: 'steam',
  twitch: 'twitch',
  airbnb: 'airbnb',
  nike: 'nike',
  adidas: 'adidas',
  binance: 'binance',
  coinbase: 'coinbase',
  openai: 'openai',
  chatgpt: 'openai',
  zoom: 'zoom',
  skype: 'skype',
  ebay: 'ebay',
  kakao: 'kakaotalk',
  kakaotalk: 'kakaotalk',
  bigolive: 'bigo',
  bumble: 'bumble',
  foodpanda: 'foodpanda',
  huya: 'huya',
  naver: 'naver',
  blizzard: 'battle-dot-net',
  alibaba: 'alibaba',
  alipay: 'alipay',
  lazada: 'lazada',
  shopee: 'shopee',
  tokopedia: 'tokopedia',
  gojek: 'gojek',
  grab: 'grab',
  bolt: 'bolt',
  glovo: 'glovo',
  wolt: 'wolt',
  yandex: 'yandex',
  vk: 'vk',
  mailru: 'maildotru',
  mail_ru: 'maildotru',
  ok: 'odnoklassniki',
  ok_ru: 'odnoklassniki',
  imo: 'imo',
  clubhouse: 'clubhouse',
  hinge: 'hinge',
  redbook: 'xiaohongshu',
  xiaohongshu: 'xiaohongshu',
  noon: 'noon',
  leboncoin: 'leboncoin',
  mcdonalds: 'mcdonalds',
  kfc: 'kfc',
  starbucks: 'starbucks',
  deliveryclub: 'deliveryhero',
  delivery_club: 'deliveryhero',
  wildberries: 'wildberries',
  ozon: 'ozon',
  avito: 'avito',
  crypto_com: 'cryptodotcom',
  kucoin: 'kucoin',
  bybit: 'bybit',
  okx: 'okx',
  huobi: 'htx',
  kraken: 'kraken',
  bitget: 'bitget',
  fiverr: 'fiverr',
  upwork: 'upwork',
  freelancer: 'freelancer',
  bet365: 'bet365',
  getir: 'getir',
  nttgame: 'nttgame',
  hily: 'hily',
  ubisoft: 'ubisoft',
  tango: 'tango',
};

/**
 * Resolves a 5SIM service to its expected Simple Icons CDN URL.
 * If the URL returns a 404 (handled by the client), it falls back to the generic icon.
 */
export function getServiceLogo(serviceName: string, serviceSlug: string): string {
  const cleanSlug = (serviceSlug || '').toLowerCase().trim();
  
  // 1. Check explicit alias map
  // 2. Try stripping underscores (e.g. "mail_ru" -> "mailru")
  // 3. Fallback to the raw slug as a guess
  const iconSlug = 
    ALIAS_MAP[cleanSlug] || 
    ALIAS_MAP[cleanSlug.replace(/_/g, '')] || 
    cleanSlug.replace(/_/g, '');

  return `https://cdn.simpleicons.org/${encodeURIComponent(iconSlug)}/ffffff`;
}

/**
 * Normalizes internal supplier service slugs into clean, customer-facing brand names.
 */
export function formatServiceDisplayName(slug: string): string {
  const overrides: Record<string, string> = {
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    youtube: 'YouTube',
    paypal: 'PayPal',
    tiktok: 'TikTok',
    wechat: 'WeChat',
    linkedin: 'LinkedIn',
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
  };
  const clean = (slug || '').toLowerCase();
  if (overrides[clean]) return overrides[clean];
  
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}