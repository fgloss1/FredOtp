import { getServiceLogo } from './service-logo';

describe('getServiceLogo', () => {
  it.each([
    ['WhatsApp', 'whatsapp', 'whatsapp'],
    ['Telegram', 'telegram', 'telegram'],
    ['Instagram', 'instagram', 'instagram'],
    ['TikTok', 'tiktok', 'tiktok'],
    ['Facebook', 'facebook', 'facebook'],
    ['Google Mail', 'google_mail', 'gmail'],
    ['Google', 'google', 'google'],
    ['PayPal', 'paypal', 'paypal'],
    ['Uber', 'uber', 'uber'],
    ['X / Twitter', 'twitter', 'x'],
    ['Discord', 'discord', 'discord'],
    ['Snapchat', 'snapchat', 'snapchat'],
    ['Reddit', 'reddit', 'reddit'],
    ['Apple', 'apple', 'apple'],
    ['Binance', 'binance', 'binance'],
    ['Deliveroo', 'deliveroo', 'deliveroo'],
    ['Weibo', 'weibo', 'sinaweibo'],
    ['Proton Mail', 'protonmail', 'protonmail'],
  ])('resolves %s from the live service slug', (name, slug, iconSlug) => {
    const version = iconSlug === 'openai' ? '15.12.0' : '16.33.0';
    expect(getServiceLogo(name, slug)).toBe(
      `https://cdn.jsdelivr.net/npm/simple-icons@${version}/icons/${iconSlug}.svg`
    );
  });

  it.each([
    ['OpenAI', 'openai'],
    ['ChatGPT', 'chatgpt'],
  ])('uses the pinned official OpenAI icon for %s', (name, slug) => {
    expect(getServiceLogo(name, slug)).toBe(
      'https://cdn.jsdelivr.net/npm/simple-icons@15.12.0/icons/openai.svg'
    );
  });

  it('normalizes punctuation and separators before resolving aliases', () => {
    expect(getServiceLogo(' Pay-Pal! ', 'unknown_provider_slug')).toBe(
      'https://cdn.jsdelivr.net/npm/simple-icons@16.33.0/icons/paypal.svg'
    );
    expect(getServiceLogo('unrecognized name', 'X / Twitter')).toBe(
      'https://cdn.jsdelivr.net/npm/simple-icons@16.33.0/icons/x.svg'
    );
  });

  it('returns null rather than guessing for an unknown service', () => {
    expect(getServiceLogo('Unknown Chat App', 'unknown_chat_app')).toBeNull();
    expect(getServiceLogo('', '')).toBeNull();
    expect(getServiceLogo('LinkedIn', 'linkedin')).toBeNull();
    expect(getServiceLogo('Microsoft Outlook', 'outlook')).toBeNull();
  });
});