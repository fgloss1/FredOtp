import "dotenv/config";
import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";

const isProduction = process.env.NODE_ENV === "production";
const allowDemoData = process.env.ALLOW_DEMO_DATA === "true" && !isProduction;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const productionServiceSlugs = new Set(
  (process.env.PRODUCTION_SERVICE_SLUGS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const COUNTRIES = [
  ["NG", "Nigeria", "+234", "🇳🇬", "+234 8## ### ####", 90, "Africa"],
  ["US", "United States", "+1", "🇺🇸", "+1 (%##) %##-####", 135, "North America"],
  ["GB", "United Kingdom", "+44", "🇬🇧", "+44 7%# ### ###", 125, "Europe"],
  ["CA", "Canada", "+1", "🇨🇦", "+1 (%##) %##-####", 120, "North America"],
  ["GH", "Ghana", "+233", "🇬🇭", "+233 %# ### ####", 85, "Africa"],
  ["KE", "Kenya", "+254", "🇰🇪", "+254 7## ### ###", 80, "Africa"],
  ["ZA", "South Africa", "+27", "🇿🇦", "+27 %# ### ####", 100, "Africa"],
  ["EG", "Egypt", "+20", "🇪🇬", "+20 1## ### ####", 70, "Africa"],
  ["IN", "India", "+91", "🇮🇳", "+91 %#### #####", 70, "Asia"],
  ["PH", "Philippines", "+63", "🇵🇭", "+63 9## ### ####", 75, "Asia"],
  ["ID", "Indonesia", "+62", "🇮🇩", "+62 8%# #### ####", 65, "Asia"],
  ["DE", "Germany", "+49", "🇩🇪", "+49 1%# ########", 130, "Europe"],
  ["FR", "France", "+33", "🇫🇷", "+33 6 ## ## ## ##", 115, "Europe"],
  ["NL", "Netherlands", "+31", "🇳🇱", "+31 6 ## ## ## ##", 118, "Europe"],
  ["BR", "Brazil", "+55", "🇧🇷", "+55 %# 9####-####", 90, "South America"],
  ["UA", "Ukraine", "+380", "🇺🇦", "+380 %# ### ####", 55, "Europe"],
];

const SERVICES = [
  ["match", "Match", "Dating", "💘", "#f43f5e", 95, "Match: {code} is your verification code. Do not share it.", true],
  ["zoosk", "Zoosk", "Dating", "💫", "#f97316", 85, "Zoosk code: {code}. Enter it to verify your account.", true],
  ["tinder", "Tinder", "Dating", "🔥", "#fb7185", 90, "Your Tinder code is {code}. Don't share.", true],
  ["bumble", "Bumble", "Dating", "🐝", "#facc15", 88, "Bumble: your verification code is {code}.", false],
  ["hinge", "Hinge", "Dating", "🪄", "#a78bfa", 82, "Hinge code {code}. Never share this code.", false],
  ["badoo", "Badoo", "Dating", "💜", "#c084fc", 78, "Badoo: {code} is your confirmation code.", false],
  ["gmail", "Gmail / Google", "Email", "✉️", "#ef4444", 45, "G-{code} is your Google verification code.", true],
  ["outlook", "Outlook", "Email", "📮", "#0ea5e9", 42, "Microsoft account security code: {code}", false],
  ["yahoo", "Yahoo Mail", "Email", "📬", "#7c3aed", 40, "{code} is your Yahoo verification code.", false],
  ["paypal", "PayPal", "Finance", "🅿️", "#2563eb", 120, "PayPal: {code} is your security code. Never share it.", true],
  ["venmo", "Venmo", "Finance", "💸", "#38bdf8", 135, "Venmo: your phone verification code is {code}.", true],
  ["cashapp", "Cash App", "Finance", "💵", "#22c55e", 140, "Cash App: {code} is your sign-in code.", true],
  ["coinbase", "Coinbase", "Finance", "🪙", "#3b82f6", 150, "Coinbase verification code: {code}. Never share.", false],
  ["binance", "Binance", "Finance", "🟡", "#eab308", 130, "[Binance] Verification code: {code}", false],
  ["revolut", "Revolut", "Finance", "🏦", "#818cf8", 125, "Revolut code: {code}. We will never call you for it.", false],
  ["chime", "Chime", "Finance", "🌿", "#34d399", 128, "Chime: {code} is your verification code.", false],
  ["whatsapp", "WhatsApp", "Messaging", "💬", "#25d366", 60, "Your WhatsApp code is {code}. Don't share this code.", true],
  ["telegram", "Telegram", "Messaging", "✈️", "#38bdf8", 55, "Telegram code: {code}. Do not give this code to anyone.", true],
  ["signal", "Signal", "Messaging", "🔐", "#6366f1", 58, "Your Signal verification code: {code}", false],
  ["discord", "Discord", "Messaging", "🎮", "#818cf8", 30, "Your Discord verification code is {code}.", false],
  ["facebook", "Facebook", "Social", "📘", "#1d4ed8", 35, "{code} is your Facebook confirmation code.", true],
  ["instagram", "Instagram", "Social", "📸", "#ec4899", 40, "{code} is your Instagram code. Don't share it.", true],
  ["tiktok", "TikTok", "Social", "🎵", "#f43f5e", 38, "[TikTok] {code} is your verification code", false],
  ["twitter", "X (Twitter)", "Social", "✖️", "#94a3b8", 48, "Your X confirmation code is {code}.", false],
  ["snapchat", "Snapchat", "Social", "👻", "#fbbf24", 45, "Snapchat: your code is {code}. Snap it up!", false],
  ["linkedin", "LinkedIn", "Social", "💼", "#0284c7", 52, "{code} is your LinkedIn verification code.", false],
  ["uber", "Uber", "Marketplace", "🚗", "#0f172a", 65, "Your Uber code is {code}. Reply STOP to unsubscribe.", false],
  ["airbnb", "Airbnb", "Marketplace", "🏠", "#fb7185", 75, "Your Airbnb verification code is {code}.", false],
  ["doordash", "DoorDash", "Marketplace", "🛵", "#ef4444", 70, "DoorDash: your verification code is {code}.", false],
  ["amazon", "Amazon", "Marketplace", "📦", "#f59e0b", 42, "{code} is your Amazon OTP. Do not share it.", false],
  ["netflix", "Netflix", "Entertainment", "🎬", "#dc2626", 50, "Netflix: {code} is your verification code.", false],
  ["openai", "OpenAI / ChatGPT", "Tech", "🤖", "#10b981", 80, "Your OpenAI verification code is {code}", true],

  ["okcupid", "OkCupid", "Dating", "O", "#22c55e", 75, "OkCupid verification code: {code}.", false],
  ["plentyoffish", "Plenty of Fish", "Dating", "P", "#14b8a6", 70, "POF verification code: {code}.", false],
  ["grindr", "Grindr", "Dating", "G", "#8b5cf6", 72, "Grindr verification code: {code}.", false],
  ["her", "HER", "Dating", "H", "#ec4899", 74, "HER verification code: {code}.", false],
  ["happn", "Happn", "Dating", "H", "#ef4444", 70, "Happn verification code: {code}.", false],
  ["coffeemeetsbagel", "Coffee Meets Bagel", "Dating", "C", "#92400e", 75, "CMB verification code: {code}.", false],
  ["protonmail", "Proton Mail", "Email", "P", "#6d28d9", 50, "Proton verification code: {code}.", false],
  ["microsoft", "Microsoft", "Email", "M", "#2563eb", 48, "Microsoft verification code: {code}.", false],
  ["wise", "Wise", "Finance", "W", "#14b8a6", 110, "Wise verification code: {code}.", false],
  ["stripe", "Stripe", "Finance", "S", "#6366f1", 115, "Stripe verification code: {code}.", false],
  ["viber", "Viber", "Messaging", "V", "#8b5cf6", 48, "Viber verification code: {code}.", false],
  ["line", "LINE", "Messaging", "L", "#16a34a", 48, "LINE verification code: {code}.", false],
  ["wechat", "WeChat", "Messaging", "W", "#22c55e", 58, "WeChat verification code: {code}.", false],
  ["skype", "Skype", "Messaging", "S", "#0ea5e9", 45, "Skype verification code: {code}.", false],
  ["slack", "Slack", "Messaging", "S", "#ec4899", 55, "Slack verification code: {code}.", false],
  ["reddit", "Reddit", "Social", "R", "#f97316", 42, "Reddit verification code: {code}.", false],
  ["ebay", "eBay", "Marketplace", "E", "#2563eb", 48, "eBay verification code: {code}.", false],
  ["etsy", "Etsy", "Marketplace", "E", "#f97316", 50, "Etsy verification code: {code}.", false],
  ["spotify", "Spotify", "Entertainment", "S", "#22c55e", 42, "Spotify verification code: {code}.", false],
  ["twitch", "Twitch", "Entertainment", "T", "#8b5cf6", 45, "Twitch verification code: {code}.", false],
  ["steam", "Steam", "Entertainment", "S", "#64748b", 55, "Steam Guard code: {code}.", false],
  ["roblox", "Roblox", "Entertainment", "R", "#ef4444", 45, "Roblox verification code: {code}.", false],
  ["github", "GitHub", "Tech", "G", "#475569", 55, "GitHub verification code: {code}.", false],
  ["gitlab", "GitLab", "Tech", "G", "#f97316", 55, "GitLab verification code: {code}.", false],
  ["notion", "Notion", "Tech", "N", "#111827", 48, "Notion verification code: {code}.", false],
  ["canva", "Canva", "Tech", "C", "#06b6d4", 50, "Canva verification code: {code}.", false],
  ["zoom", "Zoom", "Tech", "Z", "#2563eb", 45, "Zoom verification code: {code}.", false],
  ["dropbox", "Dropbox", "Tech", "D", "#2563eb", 48, "Dropbox verification code: {code}.", false],
  ["apple", "Apple", "Tech", "A", "#94a3b8", 65, "Apple verification code: {code}.", false],
  ["other", "Other / Custom Service", "Other", "O", "#10b981", 90, "Your verification code is {code}.", true],];

function pseudoRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 1000) / 1000;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

async function main() {
  console.log("Seed: starting...");
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 15000 });
  console.log("Seed: connecting to PostgreSQL...");
  await client.connect();
  console.log("Seed: PostgreSQL connected.");

  console.log(`Seed: countries = ${COUNTRIES.length}`);
  for (const [code, name, dial, flag, pattern, mult, region] of COUNTRIES) {
    await client.query(
      `insert into countries (code, name, dial_code, flag, number_pattern, multiplier_bp, region, active)
       values ($1,$2,$3,$4,$5,$6,$7,true)
       on conflict (code) do update set name = excluded.name, dial_code = excluded.dial_code,
         flag = excluded.flag, number_pattern = excluded.number_pattern,
         multiplier_bp = excluded.multiplier_bp, region = excluded.region, active = true`,
      [code, name, dial, flag, pattern, mult * 100, region],
    );
  }

  console.log(`Seed: services = ${SERVICES.length}`);
  for (const [slug, name, category, icon, accent, base, template, popular] of SERVICES) {
    await client.query(
      `insert into services (slug, name, category, icon, accent, base_price_cents, sms_template, popular, active)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (slug) do update set name = excluded.name, category = excluded.category,
         icon = excluded.icon, accent = excluded.accent, base_price_cents = excluded.base_price_cents,
         sms_template = excluded.sms_template, popular = excluded.popular, active = excluded.active`,
      [slug, name, category, icon, accent, base, template, popular, !isProduction || productionServiceSlugs.has(slug)],
    );
  }

  console.log("Seed: loading countries and services...");
  const { rows: countryRows } = await client.query("select id, code, multiplier_bp from countries");
  const { rows: serviceRows } = await client.query(
    "select id, slug, base_price_cents from services",
  );

  console.log(`Seed: creating offers for ${serviceRows.length} services × ${countryRows.length} countries...`);
  for (const service of serviceRows) {
    for (const country of countryRows) {
      const raw = (service.base_price_cents * country.multiplier_bp) / 10000;
      const price = Math.max(20, Math.round(raw / 5) * 5);
      const seed = `${service.slug}-${country.code}`;
      const stock = 25 + Math.round(pseudoRandom(seed) * 900);
      const successRate = 86 + Math.round(pseudoRandom(`s-${seed}`) * 13);
      await client.query(
        `insert into offers (service_id, country_id, price_cents, stock, success_rate)
         values ($1,$2,$3,$4,$5)
         on conflict (service_id, country_id) do update set price_cents = excluded.price_cents,
           stock = excluded.stock, success_rate = excluded.success_rate`,
        [service.id, country.id, price, stock, successRate],
      );
    }
  }

  if (allowDemoData) {
    const demoEmail = "demo@fredotp.com";
    const { rows: existing } = await client.query("select id from users where email = $1", [
      demoEmail,
    ]);

    if (existing.length === 0) {
      const { rows: created } = await client.query(
        `insert into users (email, name, password_hash, balance_cents, is_admin)
         values ($1,$2,$3,$4,false) returning id`,
        [demoEmail, "Demo Trader", hashPassword("demo1234"), 2450],
      );
      const userId = created[0].id;
      await client.query(
        `insert into transactions (user_id, type, amount_cents, description, reference)
         values ($1,'topup',2500,'Wallet top-up · Demo data','TOP-DEMO-01')`,
        [userId],
      );

      const { rows: seedRentals } = await client.query(
        `select s.id as service_id, c.id as country_id, o.price_cents, s.sms_template
         from offers o
         join services s on s.id = o.service_id
         join countries c on c.id = o.country_id
         where s.slug in ('match','paypal') and c.code in ('NG','US') limit 2`,
      );
      for (const [index, rental] of seedRentals.entries()) {
        const code = String(100000 + Math.floor(Math.random() * 899999));
        await client.query(
          `insert into rentals (user_id, service_id, country_id, phone_number, price_cents, status,
              otp_code, sms_text, deliver_after_seconds, created_at, expires_at, received_at)
           values ($1,$2,$3,$4,$5,'received',$6,$7,10, now() - interval '2 hours',
              now() - interval '105 minutes', now() - interval '119 minutes')`,
          [
            userId,
            rental.service_id,
            rental.country_id,
            index === 0 ? "+234 803 447 1290" : "+1 (415) 802-7731",
            rental.price_cents,
            code,
            rental.sms_template.replace("{code}", code),
          ],
        );
        await client.query(
          `insert into transactions (user_id, type, amount_cents, description, reference)
           values ($1,'purchase',$2,'Number rental','RNT-DEMO-0${index + 1}')`,
          [userId, -rental.price_cents],
        );
      }
    }
  }

  const counts = await client.query(
    "select (select count(*) from countries) c, (select count(*) from services) s, (select count(*) from offers) o",
  );
  console.log(
    `Seed complete → countries: ${counts.rows[0].c}, services: ${counts.rows[0].s}, offers: ${counts.rows[0].o}`,
  );

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


