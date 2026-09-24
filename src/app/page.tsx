import Image from "next/image";
import Link from "next/link";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { UiIcon } from "@/components/UiIcon";
import { SectionHeading } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth";
import { ngn, usd } from "@/lib/format";
import { getCatalog, getPlatformStats } from "@/lib/queries";
import { countryFlag, serviceIcon } from "@/lib/visuals";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    icon: "globe",
    title: "Pick service + country",
    body: "Choose Match, Zoosk, Gmail, PayPal, Venmo or 30+ other platforms, then select a Nigerian, US, UK, Ghanaian or Indian number pool.",
  },
  {
    icon: "phone",
    title: "Get a live number instantly",
    body: "A dedicated number is reserved for you in under a second, held for 15 minutes while you paste it into the signup form.",
  },
  {
    icon: "lock",
    title: "Read the OTP, done",
    body: "The inbound SMS lands in your dashboard automatically. No code inside the window? You get an automatic, full refund.",
  },
];

const FEATURES = [
  { icon: "bolt", title: "8–20 second delivery", body: "Direct carrier routes keep median OTP delivery under 20 seconds, even on Nigerian MTN and Airtel ranges." },
  { icon: "wallet", title: "Pay per code", body: "No subscription. Wallet balance is only charged when a number is issued and instantly refunded when a code never arrives." },
  { icon: "naira", title: "Naira friendly", body: "Fund your wallet with local bank transfer, card or USDT. Every price is shown in USD and Naira side by side." },
  { icon: "repeat", title: "Auto refunds", body: "Cancel a waiting rental in one tap or let it expire — either way the balance returns to your wallet automatically." },
  { icon: "shield", title: "Numbers are never reused", body: "A number is retired from the pool after your verification, so nobody else can request codes on that identity." },
  { icon: "code", title: "Developer API ready", body: "Everything in the dashboard is backed by clean REST endpoints so you can automate bulk verification flows." },
];

const FAQS: [string, string][] = [
  ["Which services can I verify?", "Over 30 platforms including Match, Zoosk, Tinder, Bumble, Hinge, Gmail/Google, Outlook, PayPal, Venmo, Cash App, Coinbase, Binance, WhatsApp, Telegram, Facebook, Instagram, TikTok, Uber, Airbnb, Amazon, Netflix and OpenAI."],
  ["Do you have Nigerian numbers?", "Yes. Nigeria (+234) is one of our largest pools with MTN, Glo, Airtel and 9mobile ranges, and it is one of the cheapest countries on the platform."],
  ["How long do I keep the number?", "Each rental is held for 15 minutes, which is more than enough for a one-time passcode. Need the same number again? Re-rent it and it stays yours while the pool holds it."],
  ["What if the code never arrives?", "You are refunded automatically. If the 15-minute window closes with no SMS, the full amount returns to your wallet and the rental is marked expired."],
  ["How do I fund my wallet?", "Top up from the wallet page using card, Nigerian bank transfer, PayPal or USDT (TRC-20). Top-ups of $50 and above receive a 10% bonus credit."],
  ["Is this a real SMS gateway?", "This deployment is a fully functional product demo: accounts, wallets, pricing, rentals and refunds all work, and inbound SMS traffic is simulated by our routing engine."],
];

const REVIEWS = [
  { name: "Chidi O.", place: "Lagos, Nigeria 🇳🇬", text: "Rented a +234 number for Match and the code hit my dashboard in 11 seconds. Prices in Naira make budgeting easy." },
  { name: "Marcus D.", place: "Atlanta, USA 🇺🇸", text: "I run signups for a small agency — bulk Venmo and PayPal verifications used to take hours. Now it's a few clicks per account." },
  { name: "Priya S.", place: "Bengaluru, India 🇮🇳", text: "The auto refund is what sold me. Two codes failed last month and my wallet was topped back up before I even noticed." },
];

export default async function HomePage() {
  const [catalog, stats, user] = await Promise.all([
    getCatalog(),
    getPlatformStats(),
    getCurrentUser(),
  ]);

  const countryFloor = catalog.countries
    .map((country) => {
      const prices = catalog.offers
        .filter((offer) => offer.countryId === country.id)
        .map((offer) => offer.priceCents);
      const stock = catalog.offers
        .filter((offer) => offer.countryId === country.id)
        .reduce((sum, offer) => sum + offer.stock, 0);
      return { ...country, from: prices.length ? Math.min(...prices) : 0, stock };
    })
    .sort((a, b) => a.from - b.from);

  const ticker = catalog.services.slice(0, 16);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-ring" />
                {stats.numbers.toLocaleString()} live numbers across {stats.countries} countries
              </span>

              <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Rent a number.
                <br />
                Catch the{" "}
                <span className="bg-gradient-to-r from-mint-400 via-brand-400 to-indigo-400 bg-clip-text text-transparent">
                  OTP in seconds.
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
                NAVA gives you disposable virtual numbers from Nigeria, the USA, UK, Ghana,
                Kenya, India and 10 more countries to verify Match, Zoosk, Gmail, PayPal, Venmo,
                WhatsApp and {stats.services - 6}+ other platforms. Pay per code — refunded
                automatically if the SMS never lands.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={user ? "/dashboard" : "/register"}
                  className="glow-btn rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-6 py-3.5 text-sm font-extrabold text-ink-950 transition hover:brightness-110"
                >
                  {user ? "Open dashboard" : "Create free account →"}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-white/12 bg-white/5 px-6 py-3.5 text-sm font-bold text-white transition hover:border-emerald-400/40 hover:text-emerald-300"
                >
                  See all prices
                </Link>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                <Stat label="Codes delivered" value={`${Math.round(stats.delivered / 1000)}k+`} />
                <Stat label="Avg. delivery" value="14s" />
                <Stat label="Cheapest code" value={usd(Math.min(...catalog.offers.map((o) => o.priceCents)))} />
              </dl>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 blur-3xl" />
              <div className="card overflow-hidden p-3">
                <Image
                  src="/images/hero-otp.svg"
                  alt="Virtual phone receiving a one-time passcode"
                  width={900}
                  height={900}
                  priority
                  className="h-auto w-full rounded-xl"
                />
              </div>

              <div className="card absolute -bottom-6 -left-4 w-64 p-4 shadow-2xl backdrop-blur sm:-left-8">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-ring" />
                  Incoming SMS · 🇳🇬 +234 803 ••• 1290
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Match: <span className="font-mono font-bold text-emerald-300">482917</span> is your
                  verification code.
                </p>
              </div>
            </div>
          </div>

          {/* ticker */}
          <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-4">
            <div className="animate-ticker flex w-max gap-10 whitespace-nowrap">
              {[...ticker, ...ticker].map((service, index) => (
                <span
                  key={`${service.id}-${index}`}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500"
                >
                  <span className="text-lg">{serviceIcon(service.slug)}</span>
                  {service.name}
                  <span className="text-emerald-400/70">{usd(service.minPriceCents)}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Services + prices */}
        <section id="services" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Live catalog"
            title="Every service, every country, one price list"
            subtitle="Pick a country to see live inventory and per-code pricing. Prices update with pool demand — Nigerian and Asian pools are always the cheapest."
          />
          <div className="mt-10">
            <CatalogExplorer catalog={catalog} authed={Boolean(user)} />
          </div>
        </section>

        {/* Countries */}
        <section className="border-y border-white/5 bg-white/[0.015] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="16 countries"
              title="Numbers from the pools that actually convert"
              subtitle="Nigeria, Ghana, Kenya, South Africa, Egypt plus USA, UK, Canada and Europe — with live stock counts."
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {countryFloor.map((country) => (
                <Link
                  key={country.id}
                  href={`/pricing?country=${country.code}`}
                  className="card flex items-center justify-between p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{countryFlag(country.code)}</span>
                    <div>
                      <p className="text-sm font-bold text-white">{country.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {country.dialCode} · {country.stock.toLocaleString()} numbers
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-300">{usd(country.from)}</p>
                    <p className="text-[10px] text-slate-500">{ngn(country.from)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps from signup to verified"
            center
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="card relative p-6">
                <span className="absolute right-5 top-5 text-5xl font-black text-white/5">
                  {index + 1}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 text-2xl ring-1 ring-white/10">
                  <UiIcon name={step.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-white/5 bg-white/[0.015] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading
              eyebrow="Why NAVA"
              title="Built for people who verify at scale"
              subtitle="Fast routes, honest refunds and pricing that respects local currencies."
            />
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card p-6">
                  <span className="text-brand-300"><UiIcon name={feature.icon} className="h-6 w-6" /></span>
                  <h3 className="mt-4 text-base font-bold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wallet packs */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Wallet packs"
            title="Top up once, verify all month"
            subtitle="No subscriptions. Load your wallet and spend it code by code. Packs from $50 include a 10% bonus."
            center
          />
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {[
              { amount: 500, label: "Starter", note: "≈ 12 Nigerian Gmail codes", bonus: 0, featured: false },
              { amount: 5000, label: "Pro", note: "≈ 130 codes · 10% bonus", bonus: 500, featured: true },
              { amount: 20000, label: "Agency", note: "≈ 520 codes · 10% bonus + priority routes", bonus: 2000, featured: false },
            ].map((pack) => (
              <div
                key={pack.label}
                className={`card relative p-6 ${pack.featured ? "border-emerald-400/40 ring-1 ring-emerald-400/20" : ""}`}
              >
                {pack.featured && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-mint-400 to-brand-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ink-950">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{pack.label}</p>
                <p className="mt-3 text-3xl font-black text-white">{usd(pack.amount)}</p>
                <p className="text-xs text-slate-500">{ngn(pack.amount)}</p>
                {pack.bonus > 0 && (
                  <p className="mt-2 inline-block rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                    +{usd(pack.bonus)} bonus credit
                  </p>
                )}
                <p className="mt-4 text-sm text-slate-400">{pack.note}</p>
                <Link
                  href={user ? `/dashboard/wallet?amount=${pack.amount}` : "/register"}
                  className={`mt-6 block rounded-xl py-3 text-center text-sm font-bold transition ${
                    pack.featured
                      ? "bg-gradient-to-r from-mint-500 to-brand-500 text-ink-950 hover:brightness-110"
                      : "border border-white/12 text-white hover:border-emerald-400/40 hover:text-emerald-300"
                  }`}
                >
                  Fund wallet
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="border-y border-white/5 bg-white/[0.015] py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading eyebrow="Customers" title="Trusted from Lagos to Los Angeles" />
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {REVIEWS.map((review) => (
                <div key={review.name} className="card p-6">
                  <p className="text-amber-300">★★★★★</p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">“{review.text}”</p>
                  <div className="mt-5 border-t border-white/5 pt-4">
                    <p className="text-sm font-bold text-white">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.place}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="FAQ" title="Questions, answered" center />
          <div className="mt-10 space-y-3">
            {FAQS.map(([question, answer]) => (
              <details key={question} className="card group p-5 open:border-emerald-400/25">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-white">
                  {question}
                  <span className="text-emerald-300 transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="card relative overflow-hidden p-10 text-center sm:p-14">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan-500/15" />
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Your next OTP is 14 seconds away
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-400">
              Create an account, fund your wallet and rent your first number when you are ready.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={user ? "/dashboard" : "/register"}
                className="glow-btn rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-7 py-3.5 text-sm font-extrabold text-ink-950 transition hover:brightness-110"
              >
                {user ? "Rent a number" : "Create your account"}
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/12 px-7 py-3.5 text-sm font-bold text-white transition hover:border-emerald-400/40 hover:text-emerald-300"
              >
                I already have an account
              </Link>
            </div>
            {process.env.NODE_ENV !== "production" && (
              <p className="mt-6 text-xs text-slate-500">Development demo data is available only outside production.</p>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold text-white">{value}</dd>
    </div>
  );
}


