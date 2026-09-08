"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/queries";
import { ngn, usd } from "@/lib/format";
import { countryFlag, serviceIcon } from "@/lib/visuals";

type Props = {
  catalog: Catalog;
  authed: boolean;
  defaultCountryCode?: string;
  defaultQuery?: string;
  enableMatrix?: boolean;
};

export function CatalogExplorer({
  catalog,
  authed,
  defaultCountryCode,
  defaultQuery = "",
  enableMatrix = false,
}: Props) {
  const countries = catalog.countries;
  const initialCountry =
    countries.find((c) => c.code === defaultCountryCode)?.id ??
    countries.find((c) => c.code === "NG")?.id ??
    countries[0]?.id ??
    0;

  const [countryId, setCountryId] = useState<number>(initialCountry);
  const [query, setQuery] = useState(defaultQuery);
  const [category, setCategory] = useState("All");
  const [view, setView] = useState<"cards" | "matrix">("cards");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.services.map((s) => s.category))).sort()],
    [catalog.services],
  );

  const offerMap = useMemo(() => {
    const map = new Map<string, { priceCents: number; stock: number; successRate: number }>();
    for (const offer of catalog.offers) {
      map.set(`${offer.serviceId}:${offer.countryId}`, offer);
    }
    return map;
  }, [catalog.offers]);

  const activeCountry = countries.find((c) => c.id === countryId) ?? countries[0];

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.services.filter((service) => {
      const matchesQuery =
        q.length === 0 ||
        service.name.toLowerCase().includes(q) ||
        service.slug.includes(q) ||
        service.category.toLowerCase().includes(q);
      const matchesCategory = category === "All" || service.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [catalog.services, query, category]);

  function ctaHref(slug: string) {
    const target = `/dashboard?service=${slug}&country=${activeCountry?.code ?? "NG"}`;
    return authed ? target : `/register?next=${encodeURIComponent(target)}`;
  }

  return (
    <div className="space-y-6">
      <div className="card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              ðŸ”
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Match, Zoosk, Gmail, PayPal, Venmoâ€¦"
              className="w-full rounded-xl border border-white/10 bg-ink-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Country
            </label>
            <select
              value={countryId}
              onChange={(event) => setCountryId(Number(event.target.value))}
              className="rounded-xl border border-white/10 bg-ink-900/80 px-3 py-3 text-sm font-semibold text-white focus:border-emerald-400/50 focus:outline-none"
            >
              {countries.map((country) => (
                <option key={country.id} value={country.id}>
                  {countryFlag(country.code)} {country.name} ({country.dialCode})
                </option>
              ))}
            </select>
          </div>

          {enableMatrix && (
            <div className="flex rounded-xl border border-white/10 bg-ink-900/80 p-1">
              {(["cards", "matrix"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                    view === mode ? "bg-emerald-400/15 text-emerald-300" : "text-slate-500 hover:text-white"
                  }`}
                >
                  {mode === "cards" ? "Cards" : "Full matrix"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                category === item
                  ? "bg-white text-ink-950"
                  : "border border-white/10 text-slate-400 hover:border-emerald-400/40 hover:text-emerald-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleServices.map((service) => {
            const offer = offerMap.get(`${service.id}:${countryId}`);
            const price = offer?.priceCents ?? service.minPriceCents;
            return (
              <div
                key={service.id}
                className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/30"
              >
                <div
                  className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                  style={{ background: service.accent }}
                />
                <div className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-xl ring-1 ring-white/10">
                    {serviceIcon(service.slug)}
                  </span>
                  {service.popular && (
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/25">
                      Popular
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-bold text-white">{service.name}</h3>
                <p className="text-xs text-slate-500">{service.category}</p>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xl font-extrabold text-white">{usd(price)}</p>
                    <p className="text-[11px] font-medium text-slate-500">{ngn(price)}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-500">
                    <p className="font-semibold text-emerald-300">{offer?.successRate ?? 95}% success</p>
                    <p>{(offer?.stock ?? 0).toLocaleString()} numbers</p>
                  </div>
                </div>

                <Link
                  href={ctaHref(service.slug)}
                  className="mt-4 block rounded-xl border border-emerald-400/25 bg-emerald-400/10 py-2.5 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-ink-950"
                >
                  Rent {activeCountry ? countryFlag(activeCountry.code) : "number"} number
                </Link>
              </div>
            );
          })}
          {visibleServices.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-slate-500">
              No services match â€œ{query}â€. Try another keyword.
            </p>
          )}
        </div>
      ) : (
        <div className="card scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="sticky left-0 z-10 bg-ink-800/95 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Service
                </th>
                {countries.map((country) => (
                  <th
                    key={country.id}
                    className="whitespace-nowrap px-3 py-3 text-center text-xs font-bold text-slate-400"
                    title={country.name}
                  >
                    <span className="mr-1">{countryFlag(country.code)}</span>
                    {country.code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleServices.map((service) => (
                <tr key={service.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-ink-900/95 px-4 py-3 font-semibold text-white">
                    <span className="mr-2">{serviceIcon(service.slug)}</span>
                    {service.name}
                  </td>
                  {countries.map((country) => {
                    const offer = offerMap.get(`${service.id}:${country.id}`);
                    return (
                      <td key={country.id} className="px-3 py-3 text-center">
                        {offer ? (
                          <Link
                            href={
                              authed
                                ? `/dashboard?service=${service.slug}&country=${country.code}`
                                : `/register?next=${encodeURIComponent(`/dashboard?service=${service.slug}&country=${country.code}`)}`
                            }
                            className="font-semibold text-slate-200 transition hover:text-emerald-300"
                          >
                            {usd(offer.priceCents)}
                          </Link>
                        ) : (
                          <span className="text-slate-700">â€”</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

