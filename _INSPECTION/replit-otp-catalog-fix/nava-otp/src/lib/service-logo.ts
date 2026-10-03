/**
 * Resolves only explicitly recognized brands to Simple Icons SVGs.
 * Unknown catalog entries intentionally use the generic app icon instead.
 */
const SERVICE_ICON_ALIASES: Readonly<Record<string, string>> = {
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  instagram: 'instagram',
  tiktok: 'tiktok',
  facebook: 'facebook',
  openai: 'openai',
  chatgpt: 'openai',
  gmail: 'gmail',
  googlemail: 'gmail',
  google: 'google',
  paypal: 'paypal',
  uber: 'uber',
  twitter: 'x',
  xtwitter: 'x',
  x: 'x',
  discord: 'discord',
  snapchat: 'snapchat',
  reddit: 'reddit',
  apple: 'apple',
  binance: 'binance',
  signal: 'signal',
  youtube: 'youtube',
  netflix: 'netflix',
  spotify: 'spotify',
  tinder: 'tinder',
  wechat: 'wechat',
  line: 'line',
  viber: 'viber',
  kakaotalk: 'kakaotalk',
  steam: 'steam',
  twitch: 'twitch',
  airbnb: 'airbnb',
  nike: 'nike',
  adidas: 'adidas',
  coinbase: 'coinbase',
  zoom: 'zoom',
  ebay: 'ebay',
  alipay: 'alipay',
  shopee: 'shopee',
  grab: 'grab',
  vk: 'vk',
  deliveroo: 'deliveroo',
  baidu: 'baidu',
  foodpanda: 'foodpanda',
  naver: 'naver',
  zoho: 'zoho',
  weibo: 'sinaweibo',
  sinaweibo: 'sinaweibo',
  zalo: 'zalo',
  protonmail: 'protonmail',
  vinted: 'vinted',
  ticketmaster: 'ticketmaster',
  mcdonalds: 'mcdonalds',
  fiverr: 'fiverr',
  mailru: 'maildotru',
  maildotru: 'maildotru',
  okru: 'odnoklassniki',
  odnoklassniki: 'odnoklassniki',
  kucoin: 'kucoin',
  okx: 'okx',
  upwork: 'upwork',
  freelancer: 'freelancer',
  ubisoft: 'ubisoft',
};

const CURRENT_SIMPLE_ICONS_VERSION = '16.33.0';
// The current Simple Icons release no longer ships OpenAI's logo. Keep the
// official OpenAI-sourced icon pinned to the release that still included it.
const OPENAI_SIMPLE_ICONS_VERSION = '15.12.0';

function normalizeServiceIdentifier(value?: string | null): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Returns a deterministic Simple Icons CDN URL for a known brand, or null.
 * The slug is never guessed from an arbitrary provider service name.
 */
export function getServiceLogo(
  serviceName?: string | null,
  serviceSlug?: string | null
): string | null {
  const normalizedSlug = normalizeServiceIdentifier(serviceSlug);
  const normalizedName = normalizeServiceIdentifier(serviceName);
  const iconSlug =
    SERVICE_ICON_ALIASES[normalizedSlug] || SERVICE_ICON_ALIASES[normalizedName];

  if (!iconSlug) return null;

  const version =
    iconSlug === 'openai' ? OPENAI_SIMPLE_ICONS_VERSION : CURRENT_SIMPLE_ICONS_VERSION;
  return `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${iconSlug}.svg`;
}

/** A local, consistent app-tile fallback; it makes no network request. */
const genericAppIconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <rect x="4" y="4" width="40" height="40" rx="11" fill="#263449"/>
    <rect x="13" y="13" width="22" height="22" rx="5" fill="none" stroke="#b8c4d5" stroke-width="2.5"/>
    <circle cx="19" cy="20" r="1.7" fill="#b8c4d5"/>
    <circle cx="24" cy="20" r="1.7" fill="#b8c4d5"/>
    <circle cx="29" cy="20" r="1.7" fill="#b8c4d5"/>
    <path d="M18 27h12" stroke="#b8c4d5" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;

export const GENERIC_FALLBACK_ICON = `data:image/svg+xml,${encodeURIComponent(
  genericAppIconSvg
)}`;