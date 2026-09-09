import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { SectionHeading } from "@/components/Section";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth";
import { USD_TO_NGN, usd } from "@/lib/format";
import { getCatalog } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing \u00B7 NAVA virtual number rentals",
  description:
    "Transparent per-code pricing for Match, Zoosk, Gmail, PayPal, Venmo and 30+ services across Nigeria, USA, UK, Ghana, Kenya, India and more.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; service?: string }>;
}) {
  const [params, catalog, user] = await Promise.all([searchParams, getCatalog(), getCurrentUser()]);

  const cheapestOffer = catalog.offers.reduce((best, offer) =>
    offer.priceCents < best.priceCents ? offer : best,
  );
  const cheapest = cheapestOffer.priceCents;
  const cheapestService = catalog.services.find((item) => item.id === cheapestOffer.serviceId);
  const cheapestCountry = catalog.countries.find((item) => item.id === cheapestOffer.countryId);
  const average = Math.round(
    catalog.offers.reduce((sum, offer) => sum + offer.priceCents, 0) / catalog.offers.length,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Pay per code. Nothing else."
            subtitle="No monthly fees, no minimum spend. Every rental is refunded automatically when an SMS does not arrive inside the 15 minute window."
          />

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <PriceStat
              label="Cheapest code"
              value={usd(cheapest)}
              note={`${cheapestService?.name ?? "Discord"} \u00B7 ${cheapestCountry?.flag ?? ""} ${cheapestCountry?.name ?? ""} pool`}
            />
            <PriceStat label="Average code" value={usd(average)} note={`${catalog.offers.length} live price points`} />
            <PriceStat label="Naira rate" value={`₦${USD_TO_NGN.toLocaleString()} / $1`} note="Applied to all displayed prices" />
          </div>

          <div className="mt-10">
            <CatalogExplorer
              catalog={catalog}
              authed={Boolean(user)}
              defaultCountryCode={params.country}
              defaultQuery={params.service ?? ""}
              enableMatrix
            />
          </div>

          <div className="card mt-10 grid gap-6 p-6 md:grid-cols-3">
            <div>
              <h3 className="text-sm font-bold text-white">💳 Payment methods</h3>
              <p className="mt-2 text-sm text-slate-400">
                Card, Nigerian bank transfer and USSD. Wallet credit never expires.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">🎁 Volume bonus</h3>
              <p className="mt-2 text-sm text-slate-400">
                Top-ups of $50+ automatically receive a 10% bonus credit added to your balance.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">↩️ Refund policy</h3>
              <p className="mt-2 text-sm text-slate-400">
                Cancel a waiting rental anytime before the code lands for an instant, full refund.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function PriceStat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}

