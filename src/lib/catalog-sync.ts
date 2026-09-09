import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

type SupplierApplication = {
  id: number | string;
  code?: string;
  name?: string;
};

const BASE_URL = "https://api.sms-man.com/control";
const SYNC_INTERVAL_MS = 10 * 60 * 1000;
let lastSyncAt = 0;
let syncPromise: Promise<void> | null = null;

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
  if (/tinder|bumble|hinge|badoo|match|zoosk|okcupid|plenty|grindr|happn|dating|meet|couple|her\b/.test(value)) return "Dating";
  if (/whatsapp|telegram|signal|viber|line\b|wechat|skype|messenger|discord|slack/.test(value)) return "Messaging";
  if (/facebook|instagram|tiktok|twitter|snapchat|linkedin|reddit|social/.test(value)) return "Social";
  if (/paypal|cash ?app|venmo|coinbase|binance|wise\b|revolut|chime|stripe|bank|wallet|crypto/.test(value)) return "Finance";
  if (/amazon|ebay|etsy|walmart|shop|aliexpress|delivery|doordash|uber eats/.test(value)) return "Shopping";
  if (/gmail|google|outlook|microsoft|yahoo|proton|mail|email/.test(value)) return "Email";
  if (/netflix|spotify|twitch|steam|roblox|gaming|game/.test(value)) return "Entertainment";
  if (/uber|airbnb|booking|travel|lyft|bolt/.test(value)) return "Travel";
  if (/github|gitlab|openai|chatgpt|canva|notion|zoom|dropbox|apple|adobe|tech/.test(value)) return "Tech";
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

async function runSync(): Promise<void> {
  const applications = await fetchApplications();
  if (applications.length === 0) return;

  const seen = new Set<string>();
  for (const application of applications) {
    const name = String(application.name ?? "").trim();
    const code = String(application.code ?? "").trim().toLowerCase();
    const slug = slugify(code || name);
    if (!name || !slug || slug === "other" || seen.has(slug)) continue;
    seen.add(slug);

    await db
      .insert(services)
      .values({
        slug,
        name: name.slice(0, 120),
        category: categoryFor(name),
        icon: "•",
        accent: "#38bdf8",
        basePriceCents: 0,
        smsTemplate: "Your verification code is {code}.",
        popular: false,
        active: true,
      })
      .onConflictDoUpdate({
        target: services.slug,
        set: {
          name: name.slice(0, 120),
          category: categoryFor(name),
          active: true,
        },
      });
  }
}

export async function syncSupplierCatalog(): Promise<void> {
  if (!token()) return;
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
