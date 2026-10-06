/**
 * ISO 3166-1 alpha-2 codes. This set validates country codes only; catalog
 * entries continue to come from the live 5SIM prices and countries endpoints.
 */
const ISO_ALPHA_2_CODES = new Set(
  `ad ae af ag ai al am ao aq ar as at au aw ax az
  ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz
  ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz
  de dj dk dm do dz
  ec ee eg eh er es et
  fi fj fk fm fo fr
  ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy
  hk hm hn hr ht hu
  id ie il im in io iq ir is it
  je jm jo jp
  ke kg kh ki km kn kp kr kw ky kz
  la lb lc li lk lr ls lt lu lv ly
  ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz
  na nc ne nf ng ni nl no np nr nu nz
  om
  pa pe pf pg ph pk pl pm pn pr ps pt pw py
  qa
  re ro rs ru rw
  sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz
  tc td tf tg th tj tk tl tm tn to tr tt tv tw tz
  ua ug um us uy uz
  va vc ve vg vi vn vu
  wf ws
  ye yt
  za zm zw`
    .trim()
    .split(/\s+/)
);

/**
 * These are exact 5SIM identifiers with no usable ISO value in its current
 * /guest/countries response, plus its known French Guiana ISO metadata error.
 * The provider's ISO field takes precedence for all other live countries.
 */
const COUNTRY_CODE_OVERRIDES: Readonly<Record<string, string>> = {
  frenchguiana: 'gf',
};

const COUNTRY_CODE_FALLBACKS: Readonly<Record<string, string>> = {
  belarus: 'by',
  ukraine: 'ua',
};

function normalizeCountrySlug(value?: string | null): string {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizeCountryCode(countryCode: unknown): string | null {
  if (typeof countryCode !== 'string') return null;

  const normalized = countryCode.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) && ISO_ALPHA_2_CODES.has(normalized)
    ? normalized
    : null;
}

/** Resolves the ISO field returned by 5SIM, with narrow provider corrections. */
export function getCountryCodeFromProvider(
  countrySlug: string,
  providerIso: unknown
): string | null {
  const normalizedSlug = normalizeCountrySlug(countrySlug);
  const override = COUNTRY_CODE_OVERRIDES[normalizedSlug];
  if (override) return normalizeCountryCode(override);

  if (typeof providerIso === 'string') {
    const code = normalizeCountryCode(providerIso);
    if (code) return code;
  } else if (providerIso && typeof providerIso === 'object' && !Array.isArray(providerIso)) {
    const codes = Object.keys(providerIso);
    if (codes.length === 1) {
      const code = normalizeCountryCode(codes[0]);
      if (code) return code;
    }
  }

  return normalizeCountryCode(COUNTRY_CODE_FALLBACKS[normalizedSlug]);
}

/** Builds a FlagCDN URL only for a valid ISO 3166-1 alpha-2 code. */
export function getCountryFlag(countryCode: unknown): string | null {
  const code = normalizeCountryCode(countryCode);
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}