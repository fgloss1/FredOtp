/**
 * Backwards-compatible logo exports. New catalog code should import the
 * resolver from service-logo.ts directly.
 */
export { GENERIC_FALLBACK_ICON, getServiceLogo } from './service-logo';

/** Converts a live 5SIM slug into a readable label without affecting the catalog. */
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
  const clean = (slug || '').toLowerCase().trim();
  if (overrides[clean]) return overrides[clean];

  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}