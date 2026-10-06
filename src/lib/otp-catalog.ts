/**
 * NAVA OTP Live Catalog
 *
 * Source of truth:
 *   5SIM live guest prices API
 *
 * 5SIM response:
 *   country
 *     -> service/product
 *       -> operator
 *         -> cost
 *         -> count
 *         -> rate
 *
 * Rules:
 *   - 5SIM determines services and countries.
 *   - 5SIM determines supplier cost and inventory.
 *   - NAVA pricing determines customer retail price.
 *   - Country mappings below are ONLY for display names and flags.
 */

import {
  getAllPrices,
  getPricesForProduct,
  FiveSimOperatorPrice,
} from "./5sim";

import {
  cacheGet,
  cacheSet,
  TTL_CATALOG,
  TTL_SERVICES,
} from "./otp-cache";

import {
  isActivationProduct,
  hasInventory,
} from "./otp-utils";

import {
  calculateNavaPrice,
} from "./pricing";

import {
  getServiceLogo,
  formatServiceDisplayName,
} from "./otp-logos";

export interface GlobalService {
  slug: string;
  displayName: string;
  logoUrl: string;
  totalAvailability: number;
}

export interface ServiceCountry {
  slug: string;
  displayName: string;
  flagEmoji: string;

  /** Total live 5SIM inventory across available operators. */
  availability: number;

  /** Lowest live 5SIM supplier cost among operators with stock. */
  bestPrice: number;

  /** NAVA customer retail price. */
  navaPrice: number;
}

export interface OtpQuote {
  country: string;
  service: string;
  operator: string;
  supplierCost: number;
  navaPrice: number;
  availability: number;
  estimatedDelivery: string;
  isViable: boolean;
}

/**
 * 5SIM country slug -> ISO-3166-1 alpha-2.
 *
 * This does NOT decide country availability.
 * It only converts a live 5SIM country slug into a flag.
 */
const SLUG_TO_ISO: Record<string, string> = {
  usa: "us",
  us: "us",

  uk: "gb",
  england: "gb",
  gb: "gb",

  canada: "ca",
  nigeria: "ng",
  ghana: "gh",
  kenya: "ke",

  south_africa: "za",
  southafrica: "za",

  germany: "de",
  france: "fr",
  brazil: "br",
  india: "in",
  russia: "ru",

  indonesia: "id",
  philippines: "ph",
  vietnam: "vn",
  mexico: "mx",

  spain: "es",
  italy: "it",
  netherlands: "nl",
  poland: "pl",
  turkey: "tr",

  egypt: "eg",
  colombia: "co",
  argentina: "ar",
  thailand: "th",
  malaysia: "my",

  hongkong: "hk",
  hong_kong: "hk",

  morocco: "ma",
  sweden: "se",
  switzerland: "ch",

  australia: "au",
  japan: "jp",
  china: "cn",

  south_korea: "kr",
  korea: "kr",

  uae: "ae",
  saudi: "sa",
  pakistan: "pk",
  bangladesh: "bd",
  singapore: "sg",

  chile: "cl",
  peru: "pe",
  ukraine: "ua",

  czech: "cz",
  czechia: "cz",

  romania: "ro",
  hungary: "hu",
  greece: "gr",
  israel: "il",
  portugal: "pt",

  ireland: "ie",
  austria: "at",
  belgium: "be",
  denmark: "dk",
  finland: "fi",

  norway: "no",
  georgia: "ge",
  taiwan: "tw",
  macau: "mo",

  estonia: "ee",
  lithuania: "lt",
  latvia: "lv",

  kazakhstan: "kz",
  uzbekistan: "uz",
  kyrgyzstan: "kg",
  tajikistan: "tj",

  cambodia: "kh",
  mongolia: "mn",
  nepal: "np",
  myanmar: "mm",
  sri_lanka: "lk",
  maldives: "mv",
  afghanistan: "af",

  iran: "ir",
  iraq: "iq",
  syria: "sy",
  jordan: "jo",
  lebanon: "lb",

  yemen: "ye",
  oman: "om",
  qatar: "qa",
  kuwait: "kw",
  bahrain: "bh",

  cyprus: "cy",
  malta: "mt",
  iceland: "is",
  luxembourg: "lu",

  croatia: "hr",
  slovenia: "si",
  slovakia: "sk",
  bulgaria: "bg",
  serbia: "rs",
  bosnia: "ba",
  montenegro: "me",
  albania: "al",
  macedonia: "mk",
  moldova: "md",
  belarus: "by",

  armenia: "am",
  azerbaijan: "az",

  angola: "ao",
  cameroon: "cm",
  senegal: "sn",
  ivory_coast: "ci",
  mali: "ml",
  guinea: "gn",
  sierra_leone: "sl",
  liberia: "lr",
  burkina_faso: "bf",
  togo: "tg",
  benin: "bj",
  niger: "ne",
  chad: "td",
  mauritania: "mr",
  sudan: "sd",
  ethiopia: "et",
  somalia: "so",
  djibouti: "dj",
  uganda: "ug",
  rwanda: "rw",
  burundi: "bi",
  tanzania: "tz",
  zambia: "zm",
  malawi: "mw",
  mozambique: "mz",
  zimbabwe: "zw",
  botswana: "bw",
  namibia: "na",
  lesotho: "ls",
  swaziland: "sz",
  madagascar: "mg",
  mauritius: "mu",
  seychelles: "sc",
  congo: "cg",
  gabon: "ga",
  gambia: "gm",
  equatorial_guinea: "gq",
  sao_tome: "st",
  central_african: "cf",

  venezuela: "ve",
  guyana: "gy",
  suriname: "sr",
  ecuador: "ec",
  bolivia: "bo",
  paraguay: "py",
  uruguay: "uy",

  panama: "pa",
  cuba: "cu",
  dominican: "do",
  haiti: "ht",
  jamaica: "jm",
  puerto_rico: "pr",
  trinidad: "tt",
  bahamas: "bs",
  barbados: "bb",
  belize: "bz",
  guatemala: "gt",
  honduras: "hn",
  el_salvador: "sv",
  nicaragua: "ni",
  costa_rica: "cr",

  fiji: "fj",
  papua: "pg",
  solomon: "sb",
  vanuatu: "vu",
  samoa: "ws",
  tonga: "to",
};

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  england: "United Kingdom",
  uk: "United Kingdom",
  usa: "United States",
  us: "United States",

  hongkong: "Hong Kong",
  hong_kong: "Hong Kong",

  south_africa: "South Africa",
  south_korea: "South Korea",

  czech: "Czech Republic",
  uae: "United Arab Emirates",
  saudi: "Saudi Arabia",

  new_zealand: "New Zealand",
  costa_rica: "Costa Rica",
  puerto_rico: "Puerto Rico",

  dominican: "Dominican Republic",
  ivory_coast: "Ivory Coast",
};

/**
 * Convert a live 5SIM country slug to a display flag.
 */
function getFlagEmoji(slug: string): string {
  const original = slug.toLowerCase().trim();

  const compact = original.replace(/_/g, "");

  const iso =
    SLUG_TO_ISO[original] ||
    SLUG_TO_ISO[compact] ||
    (compact.length === 2 ? compact : null);

  if (!iso) {
    return "🌐";
  }

  const codePoints = iso
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Convert a live 5SIM country slug to a customer-facing name.
 */
function formatCountrySlug(slug: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  const compact = cleanSlug.replace(/_/g, "");

  if (DISPLAY_NAME_OVERRIDES[cleanSlug]) {
    return DISPLAY_NAME_OVERRIDES[cleanSlug];
  }

  if (DISPLAY_NAME_OVERRIDES[compact]) {
    return DISPLAY_NAME_OVERRIDES[compact];
  }

  return slug
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * 5SIM's `cost` is already the live supplier number price.
 *
 * There is NO RUB -> USD conversion here.
 */
function normalizePriceUsd(rawCost: unknown): number {
  const cost = Number(rawCost);

  if (!Number.isFinite(cost) || cost <= 0) {
    return 0;
  }

  return Number(cost.toFixed(4));
}

/**
 * Parse operator records from a 5SIM product/country node.
 *
 * Expected:
 *
 * {
 *   "virtual51": {
 *     "cost": 0.12,
 *     "count": 100,
 *     "rate": 92.4
 *   },
 *   "vodafone": {
 *     "cost": 0.20,
 *     "count": 50,
 *     "rate": 98.1
 *   }
 * }
 */
function extractOperators(
  productData: unknown
): Array<{
  slug: string;
  price: number;
  qty: number;
  rate: number | null;
  category: string;
}> {
  if (!productData || typeof productData !== "object") {
    return [];
  }

  const result: Array<{
    slug: string;
    price: number;
    qty: number;
    rate: number | null;
    category: string;
  }> = [];

  for (const [operatorSlug, operatorValue] of Object.entries(
    productData as Record<string, unknown>
  )) {
    if (
      !operatorValue ||
      typeof operatorValue !== "object" ||
      Array.isArray(operatorValue)
    ) {
      continue;
    }

    const data = operatorValue as Record<string, unknown>;

    const price = normalizePriceUsd(data.cost);
    const qty = Number(data.count ?? 0);

    if (!Number.isFinite(qty) || qty <= 0) {
      continue;
    }

    if (price <= 0) {
      continue;
    }

    const rateValue = Number(data.rate);

    result.push({
      slug: operatorSlug,
      price,
      qty,
      rate: Number.isFinite(rateValue) ? rateValue : null,
      category: "activation",
    });
  }

  return result;
}

/**
 * Get every service that exists in the live 5SIM catalog.
 *
 * Source:
 *   GET /v1/guest/prices
 *
 * Response hierarchy:
 *   country -> product -> operator
 */
export async function getGlobalServices(): Promise<GlobalService[]> {
  const cacheKey = "otp:global_services";

  const cached = cacheGet<GlobalService[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const prices = await getAllPrices();

  const serviceMap = new Map<string, number>();

  for (const countryData of Object.values(prices)) {
    if (!countryData || typeof countryData !== "object") {
      continue;
    }

    for (const [productSlug, productData] of Object.entries(countryData)) {
      const operators = extractOperators(productData);

      const validOperators = operators.filter(
        (operator) =>
          isActivationProduct(operator) &&
          hasInventory(operator)
      );

      if (validOperators.length === 0) {
        continue;
      }

      const availability = validOperators.reduce(
        (sum, operator) => sum + operator.qty,
        0
      );

      serviceMap.set(
        productSlug,
        (serviceMap.get(productSlug) || 0) + availability
      );
    }
  }

  const result: GlobalService[] = Array.from(serviceMap.entries()).map(
    ([slug, availability]) => {
      const displayName = formatServiceDisplayName(slug);

      return {
        slug,
        displayName,
        logoUrl: getServiceLogo(displayName, slug),
        totalAvailability: availability,
      };
    }
  );

  result.sort(
    (a, b) => b.totalAvailability - a.totalAvailability
  );

  cacheSet(
    cacheKey,
    result,
    TTL_SERVICES
  );

  return result;
}

/**
 * Get countries for ONE selected service.
 *
 * IMPORTANT:
 * The countries are derived from the live 5SIM service response.
 *
 * Source:
 *   GET /v1/guest/prices?product=<service>
 *
 * Response hierarchy:
 *
 * {
 *   "instagram": {
 *     "nigeria": {
 *       "virtual51": {
 *         "cost": 0.12,
 *         "count": 427576,
 *         "rate": 95.4
 *       }
 *     }
 *   }
 * }
 */
export async function getCountriesForService(
  serviceSlug: string
): Promise<ServiceCountry[]> {
  const cleanService = serviceSlug.trim().toLowerCase();

  if (!cleanService) {
    return [];
  }

  const cacheKey = `otp:countries_for_${cleanService}`;

  const cached = cacheGet<ServiceCountry[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const liveResponse = await getPricesForProduct(cleanService);

  /*
   * 5SIM's documented product response is:
   *
   * product -> country -> operator
   *
   * Example:
   *
   * {
   *   "instagram": {
   *     "nigeria": {
   *       "virtual51": {
   *         "cost": 0.12,
   *         "count": 427576,
   *         "rate": 95.4
   *       }
   *     }
   *   }
   * }
   *
   * The API may also return the product node directly depending
   * on response normalization, so support both safely.
   */
  let serviceData: Record<string, unknown>;

  if (
    liveResponse[cleanService] &&
    typeof liveResponse[cleanService] === "object"
  ) {
    serviceData = liveResponse[cleanService] as Record<string, unknown>;
  } else {
    serviceData = liveResponse as Record<string, unknown>;
  }

  const result: ServiceCountry[] = [];

  for (const [countrySlug, countryData] of Object.entries(serviceData)) {
    const operators = extractOperators(countryData);

    if (operators.length === 0) {
      continue;
    }

    /*
     * Total inventory across all live operators with stock.
     */
    const availability = operators.reduce(
      (sum, operator) => sum + operator.qty,
      0
    );

    /*
     * Cheapest live supplier cost among operators that actually
     * have stock.
     */
    const bestOperator = operators.reduce(
      (best, current) =>
        current.price < best.price ? current : best,
      operators[0]
    );

    const bestSupplierCost = bestOperator.price;

    /*
     * NAVA pricing is applied AFTER the live 5SIM cost is known.
     *
     * 5SIM cost is NOT converted from RUB.
     */
    const pricing = calculateNavaPrice(
      bestSupplierCost,
      cleanService,
      countrySlug
    );

    /*
     * Never display an unprofitable offer.
     */
    if (!pricing.isViable) {
      continue;
    }

    result.push({
      slug: countrySlug,
      displayName: formatCountrySlug(countrySlug),
      flagEmoji: getFlagEmoji(countrySlug),
      availability,
      bestPrice: bestSupplierCost,
      navaPrice: pricing.retailPriceUSD,
    });
  }

  /*
   * Highest live stock first.
   */
  result.sort(
    (a, b) => b.availability - a.availability
  );

  cacheSet(
    cacheKey,
    result,
    TTL_CATALOG
  );

  return result;
}

/**
 * Return the live NAVA quote for one service/country pair.
 */
export async function getOtpQuote(
  country: string,
  service: string
): Promise<OtpQuote | null> {
  const cleanCountry = country.trim().toLowerCase();
  const cleanService = service.trim().toLowerCase();

  if (!cleanCountry || !cleanService) {
    return null;
  }

  const countries = await getCountriesForService(cleanService);

  const target = countries.find(
    (entry) =>
      entry.slug.toLowerCase() === cleanCountry
  );

  if (!target) {
    return null;
  }

  return {
    country: cleanCountry,
    service: cleanService,
    operator: "best-priced-live-operator",
    supplierCost: target.bestPrice,
    navaPrice: target.navaPrice,
    availability: target.availability,
    estimatedDelivery:
      target.availability > 10
        ? "< 30s"
        : "< 2 min",
    isViable: true,
  };
}
