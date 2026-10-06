import {
  getCountryCodeFromProvider,
  getCountryFlag,
  normalizeCountryCode,
} from './country-flag';

describe('country flag resolver', () => {
  it('normalizes valid ISO codes regardless of case or surrounding whitespace', () => {
    expect(normalizeCountryCode(' US ')).toBe('us');
    expect(getCountryFlag('NG')).toBe('https://flagcdn.com/w40/ng.png');
    expect(getCountryFlag(' jp ')).toBe('https://flagcdn.com/w40/jp.png');
  });

  it.each(['', 'USA', 'u1', 'ZZ', 'uk', '  '])(
    'rejects invalid or non-ISO country code %s',
    (code) => {
      expect(getCountryFlag(code)).toBeNull();
    }
  );

  it('uses the ISO code supplied by the live 5SIM country catalog', () => {
    expect(getCountryCodeFromProvider('nigeria', { NG: 1 })).toBe('ng');
    expect(getCountryCodeFromProvider('unfamiliar-provider-slug', { jp: 1 })).toBe('jp');
  });

  it('does not guess when provider metadata has ambiguous ISO values', () => {
    expect(getCountryCodeFromProvider('some-country', { us: 1, ca: 1 })).toBeNull();
  });

  it('corrects the known French Guiana metadata mismatch and missing live metadata', () => {
    expect(getCountryCodeFromProvider('frenchguiana', { fr: 1 })).toBe('gf');
    expect(getCountryCodeFromProvider('belarus', undefined)).toBe('by');
    expect(getCountryCodeFromProvider('ukraine', undefined)).toBe('ua');
  });
});