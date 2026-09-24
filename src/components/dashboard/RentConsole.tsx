"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countdown, ngn, usd } from "@/lib/format";
import { ServiceBrandIcon } from "@/components/ServiceBrandIcon";
import { UiIcon } from "@/components/UiIcon";
import { countryFlag } from "@/lib/visuals";
import { statusLabel, statusTone } from "@/lib/otp";
import type { Catalog, RentalView } from "@/lib/queries";

type Props = {
  catalog: Catalog;
  initialRentals: RentalView[];
  initialBalanceCents: number;
  defaultServiceSlug?: string;
  defaultCountryCode?: string;
};

const CATEGORY_ORDER = [
  "Popular",
  "Dating",
  "Messaging",
  "Social",
  "Finance",
  "Shopping",
  "Email",
  "Entertainment",
  "Travel",
  "Tech",
  "Other",
];

export function RentConsole({
  catalog,
  initialRentals,
  initialBalanceCents,
  defaultServiceSlug,
  defaultCountryCode,
}: Props) {
  const router = useRouter();
  const [rentals, setRentals] = useState<RentalView[]>(initialRentals);
  const [balance, setBalance] = useState(initialBalanceCents);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Popular");
  const [serviceId, setServiceId] = useState<number>(
    catalog.services.find((s) => s.slug === defaultServiceSlug)?.id ?? catalog.services[0]?.id ?? 0,
  );
  const [countryId, setCountryId] = useState<number>(
    catalog.countries.find((c) => c.code === defaultCountryCode)?.id ??
      catalog.countries.find((c) => c.code === "NG")?.id ??
      catalog.countries[0]?.id ??
      0,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const pollLock = useRef(false);

  const offerMap = useMemo(() => {
    const map = new Map<string, { priceCents: number; stock: number; successRate: number }>();
    for (const offer of catalog.offers) map.set(`${offer.serviceId}:${offer.countryId}`, offer);
    return map;
  }, [catalog.offers]);

  const categories = useMemo(() => {
    const available = new Set(catalog.services.map((service) => service.category));
    return CATEGORY_ORDER.filter((item) => item === "Popular" || available.has(item));
  }, [catalog.services]);

  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.services.filter((service) => {
      const categoryMatch = category === "Popular" ? service.popular : service.category === category;
      const queryMatch =
        !q ||
        service.name.toLowerCase().includes(q) ||
        service.slug.includes(q) ||
        service.category.toLowerCase().includes(q);
      return categoryMatch && queryMatch;
    });
  }, [catalog.services, category, query]);

  const service = catalog.services.find((s) => s.id === serviceId);
  const country = catalog.countries.find((c) => c.id === countryId);
  const offer = offerMap.get(`${serviceId}:${countryId}`);
  const price = offer?.priceCents ?? service?.minPriceCents ?? 0;
  const isLivePriced = !offer && Boolean(service);
  const waiting = rentals.filter((rental) => rental.status === "waiting");

  const refreshWaiting = useCallback(async () => {
    if (pollLock.current) return;
    const pending = rentals.filter((rental) => rental.status === "waiting");
    if (pending.length === 0) return;
    pollLock.current = true;
    try {
      const results = await Promise.all(
        pending.map(async (rental) => {
          const response = await fetch(`/api/rentals/${rental.id}`, { cache: "no-store" });
          if (!response.ok) return null;
          return (await response.json()) as { rental: RentalView; balanceCents: number };
        }),
      );
      let changed = false;
      setRentals((current) =>
        current.map((item) => {
          const match = results.find((result) => result?.rental.id === item.id);
          if (match && match.rental.status !== item.status) {
            changed = true;
            return match.rental;
          }
          return item;
        }),
      );
      const last = results.filter(Boolean).at(-1);
      if (last) setBalance(last.balanceCents);
      if (changed) router.refresh();
    } finally {
      pollLock.current = false;
    }
  }, [rentals, router]);

  useEffect(() => {
    const ticker = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    const poller = setInterval(() => {
      void refreshWaiting();
    }, 3000);
    return () => clearInterval(poller);
  }, [refreshWaiting]);

  async function rent() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, countryId }),
      });
      const data = (await response.json()) as {
        rental?: RentalView;
        balanceCents?: number;
        error?: string;
      };
      if (!response.ok || !data.rental) {
        setError(data.error ?? "Could not rent that number.");
        return;
      }
      setRentals((current) => [data.rental as RentalView, ...current]);
      if (typeof data.balanceCents === "number") setBalance(data.balanceCents);
      router.refresh();
    } catch {
      setError("Could not reach the rental service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: number) {
    try {
      const response = await fetch(`/api/rentals/${id}`, { method: "DELETE" });
      const data = (await response.json()) as {
        rental?: RentalView;
        balanceCents?: number;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not cancel.");
        return;
      }
      if (data.rental) {
        setRentals((current) => current.map((item) => (item.id === id ? data.rental! : item)));
      }
      if (typeof data.balanceCents === "number") setBalance(data.balanceCents);
      router.refresh();
    } catch {
      setError("Could not reach the rental service. Please try again.");
    }
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Rent a number</h2>
              <p className="text-sm text-slate-500">
                {catalog.services.length} services · {catalog.countries.length} countries
              </p>
            </div>
            <span className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
              Balance {usd(balance)}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Country
              </label>
              <select
                value={countryId}
                onChange={(event) => setCountryId(Number(event.target.value))}
                className="w-full rounded-xl border border-white/12 bg-ink-950/70 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-emerald-400/60"
              >
                {catalog.countries.map((item) => (
                  <option key={item.id} value={item.id}>
                    {countryFlag(item.code)} {item.name} ({item.dialCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Search service
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Match, WhatsApp, Gmail, PayPal..."
                className="w-full rounded-xl border border-white/12 bg-ink-950/70 px-3 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-400/60"
              />
            </div>
          </div>

          <div className="scrollbar-thin mt-4 flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  category === item
                    ? "bg-emerald-400 text-ink-950"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="scrollbar-thin mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {filteredServices.map((item) => {
              const itemOffer = offerMap.get(`${item.id}:${countryId}`);
              const selected = item.id === serviceId;
              const live = !itemOffer;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setServiceId(item.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-emerald-400/50 bg-emerald-400/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <ServiceBrandIcon slug={item.slug} name={item.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">
                        {item.name}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {live ? "Live availability" : `${(itemOffer.stock ?? 0).toLocaleString()} left`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-bold text-emerald-300">
                    {live ? "Live" : usd(itemOffer.priceCents)}
                  </span>
                </button>
              );
            })}
            {filteredServices.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 py-8 text-center">
                <p className="text-sm font-semibold text-slate-300">Service not found?</p>
                <p className="mt-1 text-xs text-slate-500">
                  Choose <span className="font-bold text-emerald-300">Other</span> to request an unlisted service.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="card h-fit p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order summary</h3>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <ServiceBrandIcon
              slug={service?.slug ?? "other"}
              name={service?.name ?? "Service"}
            />
            <div>
              <p className="text-sm font-bold text-white">{service?.name ?? "Select a service"}</p>
              <p className="text-xs text-slate-500">
                {country ? countryFlag(country.code) : ""} {country?.name} · {country?.dialCode}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Price per code" value={isLivePriced ? "Live supplier price" : usd(price)} />
            <Row label="In Naira" value={isLivePriced ? "Calculated at purchase" : ngn(price)} muted />
            <Row label="Success rate" value={isLivePriced ? "Live" : `${offer?.successRate ?? 95}%`} muted />
            <Row label="Numbers in pool" value={isLivePriced ? "Live" : (offer?.stock ?? 0).toLocaleString()} muted />
            <Row label="Hold window" value="15 minutes" muted />
          </dl>

          <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] px-3 py-2.5 text-xs leading-relaxed text-slate-400">
            Can't find your site or app? Select <span className="font-bold text-emerald-300">Other</span>. We’ll use the supplier’s generic service for the SMS verification.
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-300">
              {error}
            </p>
          )}

          {balance < price && !isLivePriced ? (
            <Link
              href="/dashboard/wallet"
              className="mt-5 block rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3.5 text-center text-sm font-extrabold text-ink-950"
            >
              Top up wallet to continue
            </Link>
          ) : (
            <button
              type="button"
              onClick={rent}
              disabled={busy || !service || !country}
              className="glow-btn mt-5 w-full rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 py-3.5 text-sm font-extrabold text-ink-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Reserving number…" : isLivePriced ? "Check live price & rent" : `Rent number - ${usd(price)}`}
            </button>
          )}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
            Charged only after a supplier successfully provides a number. Refunded automatically if no SMS arrives within 15 minutes.
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white">
            Active rentals{" "}
            {waiting.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-300">
                {waiting.length} waiting
              </span>
            )}
          </h2>
          <Link href="/dashboard/orders" className="text-xs font-semibold text-emerald-300 hover:underline">
            View all rentals →
          </Link>
        </div>

        {rentals.length === 0 ? (
          <div className="card p-10 text-center">
            <UiIcon name="inbox" className="h-8 w-8 text-slate-500" />
            <p className="mt-3 text-sm font-semibold text-white">No rentals yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Pick a service and country above to receive your first OTP.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {rentals.slice(0, 6).map((rental) => (
              <article key={rental.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ServiceBrandIcon slug={rental.serviceSlug} name={rental.serviceName} />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {rental.serviceName}{" "}
                        <span className="text-slate-500">· {countryFlag(rental.countryCode)} {rental.countryName}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => copy(rental.phoneNumber.replace(/\s/g, ""), `p-${rental.id}`)}
                        className="mt-0.5 font-mono text-sm text-slate-300 transition hover:text-emerald-300"
                      >
                        {rental.phoneNumber}{" "}
                        <span className="text-[10px] text-slate-600">
                          {copied === `p-${rental.id}` ? "copied!" : "tap to copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusTone(rental.status)}`}>
                      {statusLabel(rental.status)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{usd(rental.priceCents)}</span>
                  </div>
                </div>

                {rental.status === "waiting" && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
                    <div className="flex items-center gap-2.5 text-sm text-amber-200">
                      <span className="h-2 w-2 rounded-full bg-amber-400 pulse-ring" />
                      Listening for SMS… expires in <span className="font-mono font-bold">{countdown(rental.expiresAt)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancel(rental.id)}
                      className="rounded-lg border border-white/12 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300"
                    >
                      Cancel & refund
                    </button>
                  </div>
                )}

                {rental.status === "received" && rental.otpCode && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">One-time code</p>
                      <p className="font-mono text-2xl font-black tracking-[0.3em] text-emerald-300">{rental.otpCode}</p>
                      <p className="mt-1 max-w-md text-[11px] text-slate-400">{rental.smsText}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(rental.otpCode ?? "", `c-${rental.id}`)}
                      className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-ink-950 transition hover:brightness-110"
                    >
                      {copied === `c-${rental.id}` ? "Copied!" : "Copy code"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={muted ? "font-semibold text-slate-300" : "text-base font-black text-white"}>{value}</dd>
    </div>
  );
}
