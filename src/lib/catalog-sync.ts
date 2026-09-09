import { db } from "@/db";
import { services } from "@/db/schema";

type SupplierApplication = {
  id: number | string;
  code?: string;
  name?: string;
};

type CuratedService = [string, string, string, number, boolean?];

const BASE_URL = "https://api.sms-man.com/control";
const SYNC_INTERVAL_MS = 10 * 60 * 1000;
let lastSyncAt = 0;
let syncPromise: Promise<void> | null = null;

const CURATED_SERVICES: CuratedService[] = [
  ["tinder", "Tinder", "Dating", 90, true], ["bumble", "Bumble", "Dating", 88, true], ["hinge", "Hinge", "Dating", 82, true],
  ["badoo", "Badoo", "Dating", 78, true], ["match", "Match", "Dating", 95, true], ["zoosk", "Zoosk", "Dating", 85, true],
  ["okcupid", "OkCupid", "Dating", 75, true], ["plentyoffish", "Plenty of Fish", "Dating", 70, true], ["grindr", "Grindr", "Dating", 72, true],
  ["her", "HER", "Dating", 74, true], ["happn", "Happn", "Dating", 70, true], ["coffeemeetsbagel", "Coffee Meets Bagel", "Dating", 75, true],
  ["eharmony", "eHarmony", "Dating", 80], ["pof", "POF", "Dating", 70], ["meetme", "MeetMe", "Dating", 68],
  ["skout", "Skout", "Dating", 68], ["tagged", "Tagged", "Dating", 68], ["tantan", "Tantan", "Dating", 72],
  ["bumble-bizz", "Bumble Bizz", "Dating", 88], ["datingcom", "Dating.com", "Dating", 75], ["lovoo", "LOVOO", "Dating", 70],
  ["grindr-xtra", "Grindr XTRA", "Dating", 75], ["wink", "Wink", "Dating", 68], ["chappy", "Chappy", "Dating", 68],

  ["whatsapp", "WhatsApp", "Messaging", 60, true], ["telegram", "Telegram", "Messaging", 55, true], ["signal", "Signal", "Messaging", 58],
  ["discord", "Discord", "Messaging", 30, true], ["messenger", "Messenger", "Messaging", 40], ["viber", "Viber", "Messaging", 48],
  ["line", "LINE", "Messaging", 48], ["wechat", "WeChat", "Messaging", 58], ["skype", "Skype", "Messaging", 45],
  ["slack", "Slack", "Messaging", 55], ["kik", "Kik", "Messaging", 45], ["element", "Element", "Messaging", 48],
  ["wire", "Wire", "Messaging", 50], ["imo", "imo", "Messaging", 45], ["textnow", "TextNow", "Messaging", 55],
  ["zalo", "Zalo", "Messaging", 48], ["wechat-work", "WeCom", "Messaging", 52], ["groupme", "GroupMe", "Messaging", 48],

  ["facebook", "Facebook", "Social", 35, true], ["instagram", "Instagram", "Social", 40, true], ["tiktok", "TikTok", "Social", 38, true],
  ["twitter", "X (Twitter)", "Social", 48, true], ["snapchat", "Snapchat", "Social", 45, true], ["linkedin", "LinkedIn", "Social", 52, true],
  ["reddit", "Reddit", "Social", 42], ["pinterest", "Pinterest", "Social", 42], ["tumblr", "Tumblr", "Social", 40],
  ["quora", "Quora", "Social", 40], ["threads", "Threads", "Social", 42], ["bluesky", "Bluesky", "Social", 45],
  ["mastodon", "Mastodon", "Social", 45], ["bereal", "BeReal", "Social", 44], ["clubhouse", "Clubhouse", "Social", 45],
  ["weverse", "Weverse", "Social", 50],

  ["paypal", "PayPal", "Finance", 120, true], ["venmo", "Venmo", "Finance", 135, true], ["cashapp", "Cash App", "Finance", 140, true],
  ["coinbase", "Coinbase", "Finance", 150], ["binance", "Binance", "Finance", 130], ["revolut", "Revolut", "Finance", 125],
  ["chime", "Chime", "Finance", 128], ["wise", "Wise", "Finance", 110], ["stripe", "Stripe", "Finance", 115],
  ["skrill", "Skrill", "Finance", 105], ["neteller", "Neteller", "Finance", 105], ["payoneer", "Payoneer", "Finance", 115],
  ["paysend", "Paysend", "Finance", 100], ["remitly", "Remitly", "Finance", 100], ["monzo", "Monzo", "Finance", 115],
  ["n26", "N26", "Finance", 115], ["bunq", "bunq", "Finance", 115], ["bybit", "Bybit", "Finance", 130],
  ["kucoin", "KuCoin", "Finance", 125], ["okx", "OKX", "Finance", 125], ["kraken", "Kraken", "Finance", 135],
  ["metamask", "MetaMask", "Finance", 140], ["trustwallet", "Trust Wallet", "Finance", 135],

  ["amazon", "Amazon", "Shopping", 42, true], ["ebay", "eBay", "Shopping", 48], ["etsy", "Etsy", "Shopping", 50],
  ["walmart", "Walmart", "Shopping", 45], ["aliexpress", "AliExpress", "Shopping", 45], ["alibaba", "Alibaba", "Shopping", 48],
  ["shopify", "Shopify", "Shopping", 50], ["temu", "Temu", "Shopping", 45], ["shein", "SHEIN", "Shopping", 48],
  ["bestbuy", "Best Buy", "Shopping", 48], ["target", "Target", "Shopping", 48], ["wayfair", "Wayfair", "Shopping", 48],
  ["newegg", "Newegg", "Shopping", 48], ["mercadolibre", "Mercado Libre", "Shopping", 50], ["rakuten", "Rakuten", "Shopping", 50],
  ["doordash", "DoorDash", "Shopping", 70], ["ubereats", "Uber Eats", "Shopping", 68], ["instacart", "Instacart", "Shopping", 65],
  ["deliveroo", "Deliveroo", "Shopping", 65], ["glovo", "Glovo", "Shopping", 62], ["postmates", "Postmates", "Shopping", 62],

  ["gmail", "Gmail / Google", "Email", 45, true], ["outlook", "Outlook", "Email", 42], ["yahoo", "Yahoo Mail", "Email", 40],
  ["protonmail", "Proton Mail", "Email", 50], ["microsoft", "Microsoft", "Email", 48], ["icloud", "iCloud", "Email", 55],
  ["gmx", "GMX", "Email", 42], ["mailru", "Mail.ru", "Email", 42], ["zoho", "Zoho Mail", "Email", 45],
  ["yandex", "Yandex", "Email", 45], ["aol", "AOL Mail", "Email", 42], ["tutanota", "Tuta Mail", "Email", 48],

  ["netflix", "Netflix", "Entertainment", 50], ["spotify", "Spotify", "Entertainment", 42, true], ["twitch", "Twitch", "Entertainment", 45],
  ["steam", "Steam", "Entertainment", 55], ["roblox", "Roblox", "Entertainment", 45], ["disneyplus", "Disney+", "Entertainment", 52],
  ["hulu", "Hulu", "Entertainment", 50], ["primevideo", "Prime Video", "Entertainment", 48], ["paramountplus", "Paramount+", "Entertainment", 48],
  ["hbomax", "HBO Max", "Entertainment", 50], ["deezer", "Deezer", "Entertainment", 42], ["soundcloud", "SoundCloud", "Entertainment", 42],
  ["dazn", "DAZN", "Entertainment", 48], ["crunchyroll", "Crunchyroll", "Entertainment", 48], ["epicgames", "Epic Games", "Entertainment", 55],
  ["xbox", "Xbox", "Entertainment", 55], ["playstation", "PlayStation", "Entertainment", 55], ["nintendo", "Nintendo", "Entertainment", 55],

  ["uber", "Uber", "Travel", 65], ["airbnb", "Airbnb", "Travel", 75], ["booking", "Booking.com", "Travel", 70],
  ["expedia", "Expedia", "Travel", 65], ["tripadvisor", "Tripadvisor", "Travel", 55], ["lyft", "Lyft", "Travel", 65],
  ["bolt", "Bolt", "Travel", 62], ["careem", "Careem", "Travel", 62], ["agoda", "Agoda", "Travel", 65],
  ["hotelscom", "Hotels.com", "Travel", 62], ["skyscanner", "Skyscanner", "Travel", 55], ["kayak", "KAYAK", "Travel", 55],

  ["openai", "OpenAI / ChatGPT", "Tech", 80, true], ["github", "GitHub", "Tech", 55], ["gitlab", "GitLab", "Tech", 55],
  ["notion", "Notion", "Tech", 48], ["canva", "Canva", "Tech", 50], ["zoom", "Zoom", "Tech", 45],
  ["dropbox", "Dropbox", "Tech", 48], ["apple", "Apple", "Tech", 65], ["adobe", "Adobe", "Tech", 55],
  ["figma", "Figma", "Tech", 52], ["atlassian", "Atlassian", "Tech", 55], ["trello", "Trello", "Tech", 48],
  ["asana", "Asana", "Tech", 48], ["monday", "monday.com", "Tech", 48], ["linear", "Linear", "Tech", 48],
  ["vercel", "Vercel", "Tech", 50], ["digitalocean", "DigitalOcean", "Tech", 55], ["aws", "Amazon Web Services", "Tech", 60],
  ["cloudflare", "Cloudflare", "Tech", 55], ["coursera", "Coursera", "Tech", 48], ["udemy", "Udemy", "Tech", 48],

  ["googlevoice", "Google Voice", "Other", 55], ["googlemaps", "Google Maps", "Other", 42], ["shopback", "ShopBack", "Other", 48],
  ["airtime", "Airtime Service", "Other", 45], ["delivery", "Delivery Service", "Other", 55],
];

function token(): string | null {
  return process.env.SMSMAN_API_TOKEN?.trim() || null;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function categoryFor(name: string): string {
  const value = name.toLowerCase();
  if (/tinder|bumble|hinge|badoo|match|zoosk|okcupid|plenty|grindr|happn|dating|meet|couple|eharmony|tantan|lovoo|skout|tagged|wink|chappy|her\b/.test(value)) return "Dating";
  if (/whatsapp|telegram|signal|viber|line\b|wechat|skype|messenger|discord|slack|kik|element|wire|imo|textnow|zalo|groupme/.test(value)) return "Messaging";
  if (/facebook|instagram|tiktok|twitter|snapchat|linkedin|reddit|pinterest|tumblr|quora|threads|bluesky|mastodon|bereal|clubhouse|weverse|social/.test(value)) return "Social";
  if (/paypal|cash ?app|venmo|coinbase|binance|wise\b|revolut|chime|stripe|bank|wallet|crypto|skrill|neteller|payoneer|paysend|remitly|monzo|n26|bunq|bybit|kucoin|okx|kraken|metamask|trust wallet/.test(value)) return "Finance";
  if (/amazon|ebay|etsy|walmart|shop|aliexpress|alibaba|shopify|temu|shein|best buy|target|wayfair|newegg|mercado|rakuten|delivery|doordash|uber eats|instacart|deliveroo|glovo|postmates/.test(value)) return "Shopping";
  if (/gmail|google|outlook|microsoft|yahoo|proton|mail|email|icloud|gmx|mail.ru|zoho|yandex|aol|tuta/.test(value)) return "Email";
  if (/netflix|spotify|twitch|steam|roblox|gaming|game|disney|hulu|prime video|paramount|hbo|deezer|soundcloud|dazn|crunchyroll|xbox|playstation|nintendo|epic/.test(value)) return "Entertainment";
  if (/uber|airbnb|booking|travel|lyft|bolt|agoda|expedia|tripadvisor|hotels|skyscanner|kayak|careem/.test(value)) return "Travel";
  if (/github|gitlab|openai|chatgpt|canva|notion|zoom|dropbox|apple|adobe|figma|atlassian|trello|asana|monday|linear|vercel|digitalocean|aws|cloudflare|coursera|udemy|tech/.test(value)) return "Tech";
  return "Other";
}

async function fetchApplications(): Promise<SupplierApplication[]> {
  const apiToken = token();
  if (!apiToken) return [];

  const response = await fetch(
    `${BASE_URL}/applications?token=${encodeURIComponent(apiToken)}`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) throw new Error(`SMS-Man service discovery failed (${response.status}).`);
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("SMS-Man returned an invalid service directory.");
  return data as SupplierApplication[];
}

async function upsertService(slug: string, name: string, category: string, basePriceCents: number, popular: boolean): Promise<void> {
  await db
    .insert(services)
    .values({
      slug,
      name: name.slice(0, 120),
      category,
      icon: name.slice(0, 1).toUpperCase(),
      accent: "#38bdf8",
      basePriceCents,
      smsTemplate: "Your verification code is {code}.",
      popular,
      active: true,
    })
    .onConflictDoUpdate({
      target: services.slug,
      set: {
        name: name.slice(0, 120),
        category,
        basePriceCents,
        popular,
        active: true,
      },
    });
}

async function runSync(): Promise<void> {
  for (const [slug, name, category, basePriceCents, popular] of CURATED_SERVICES) {
    await upsertService(slug, name, category, basePriceCents, Boolean(popular));
  }

  const applications = await fetchApplications();
  const seen = new Set<string>();
  for (const application of applications) {
    const name = String(application.name ?? "").trim();
    const code = String(application.code ?? "").trim().toLowerCase();
    const slug = slugify(code || name);
    if (!name || !slug || slug === "other" || seen.has(slug)) continue;
    seen.add(slug);

    await upsertService(slug, name, categoryFor(name), 50, true);
  }
}

export async function syncSupplierCatalog(): Promise<void> {
  const now = Date.now();
  if (now - lastSyncAt < SYNC_INTERVAL_MS) return;
  if (syncPromise) return syncPromise;

  syncPromise = runSync()
    .catch((error) => {
      console.error("Supplier catalog sync failed", error);
    })
    .finally(() => {
      lastSyncAt = Date.now();
      syncPromise = null;
    });

  return syncPromise;
}
