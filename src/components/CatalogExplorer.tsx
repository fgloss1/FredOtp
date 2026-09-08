"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Catalog } from "@/lib/queries";
import { usd } from "@/lib/format";
import { ServiceBrandIcon } from "@/components/ServiceBrandIcon";

type Props = {
  catalog: Catalog;
  authed: boolean;
  defaultCountryCode?: string;
  defaultQuery?: string;
  enableMatrix?: boolean;
};

type CurrencyCode =
  | "USD"
  | "NGN"
  | "GBP"
  | "EUR"
  | "GHS"
  | "KES";

const CURRENCY_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  NGN: 1500,
  GBP: 0.79,
  EUR: 0.92,
  GHS: 15.5,
  KES: 129,
};

const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  USD: "US Dollar",
  NGN: "Nigerian Naira",
  GBP: "British Pound",
  EUR: "Euro",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",
};

function formatCurrency(
  cents: number,
  currency: CurrencyCode,
): string {
  const amount =
    (cents / 100) *
    CURRENCY_RATES[currency];

  const locale =
    currency === "NGN"
      ? "en-NG"
      : currency === "GHS"
        ? "en-GH"
        : currency === "KES"
          ? "en-KE"
          : currency === "GBP"
            ? "en-GB"
            : currency === "EUR"
              ? "en-IE"
              : "en-US";

  const digits =
    currency === "NGN"
      ? 0
      : 2;

  return new Intl.NumberFormat(
    locale,
    {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    },
  ).format(amount);
}

export function CatalogExplorer({
  catalog,
  authed,
  defaultCountryCode,
  defaultQuery = "",
  enableMatrix = false,
}: Props) {
  const countries = catalog.countries;

  const initialCountry =
    countries.find(
      (country) =>
        country.code ===
        defaultCountryCode,
    )?.id ??
    countries.find(
      (country) =>
        country.code === "NG",
    )?.id ??
    countries[0]?.id ??
    0;

  const [countryId, setCountryId] =
    useState<number>(
      initialCountry,
    );

  const [query, setQuery] =
    useState(defaultQuery);

  const [category, setCategory] =
    useState("All");

  const [view, setView] =
    useState<"cards" | "matrix">(
      "cards",
    );

  const [currency, setCurrency] =
    useState<CurrencyCode>(
      "USD",
    );

  const [customName, setCustomName] =
    useState("");

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          catalog.services.map(
            (service) =>
              service.category,
          ),
        ),
      ).sort(),
    ],
    [catalog.services],
  );

  const offerMap = useMemo(
    () => {
      const map =
        new Map<
          string,
          {
            priceCents: number;
            stock: number;
            successRate: number;
          }
        >();

      for (
        const offer of catalog.offers
      ) {
        map.set(
          `${offer.serviceId}:${offer.countryId}`,
          offer,
        );
      }

      return map;
    },
    [catalog.offers],
  );

  const activeCountry =
    countries.find(
      (country) =>
        country.id === countryId,
    ) ??
    countries[0];

  const visibleServices =
    useMemo(
      () => {
        const q =
          query
            .trim()
            .toLowerCase();

        return catalog.services.filter(
          (service) => {
            const matchesQuery =
              q.length === 0 ||
              service.name
                .toLowerCase()
                .includes(q) ||
              service.slug
                .toLowerCase()
                .includes(q) ||
              service.category
                .toLowerCase()
                .includes(q);

            const matchesCategory =
              category === "All" ||
              service.category ===
                category;

            return (
              matchesQuery &&
              matchesCategory
            );
          },
        );
      },
      [
        catalog.services,
        query,
        category,
      ],
    );

  const otherService =
    catalog.services.find(
      (service) =>
        service.slug ===
        "other",
    );

  function ctaHref(
    slug: string,
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "service",
      slug,
    );

    params.set(
      "country",
      activeCountry?.code ??
        "NG",
    );

    if (
      slug === "other" &&
      customName.trim()
    ) {
      params.set(
        "customName",
        customName.trim(),
      );
    }

    const target =
      `/dashboard?${params.toString()}`;

    return authed
      ? target
      : `/register?next=${encodeURIComponent(
          target,
        )}`;
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
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Search Match, WhatsApp, Gmail, PayPal..."
              aria-label="Search services"
              className="w-full rounded-xl border border-white/10 bg-ink-900/80 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Country

              <select
                value={countryId}
                onChange={(event) =>
                  setCountryId(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                className="ml-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-3 text-sm font-semibold text-white focus:border-emerald-400/50 focus:outline-none"
              >
                {countries.map(
                  (country) => (
                    <option
                      key={country.id}
                      value={country.id}
                    >
                      {country.flag}{" "}
                      {country.name}{" "}
                      ({country.dialCode})
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Currency

              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target
                      .value as CurrencyCode,
                  )
                }
                className="ml-2 rounded-xl border border-white/10 bg-ink-900/80 px-3 py-3 text-sm font-semibold text-white focus:border-emerald-400/50 focus:outline-none"
              >
                {(
                  Object.keys(
                    CURRENCY_NAMES,
                  ) as CurrencyCode[]
                ).map(
                  (code) => (
                    <option
                      key={code}
                      value={code}
                    >
                      {code} -{" "}
                      {
                        CURRENCY_NAMES[
                          code
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            {enableMatrix && (
              <div className="flex rounded-xl border border-white/10 bg-ink-900/80 p-1">
                {(
                  [
                    "cards",
                    "matrix",
                  ] as const
                ).map(
                  (mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        setView(
                          mode,
                        )
                      }
                      className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                        view === mode
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "text-slate-500 hover:text-white"
                      }`}
                    >
                      {mode ===
                      "cards"
                        ? "Cards"
                        : "Full matrix"}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map(
            (item) => (
              <button
                key={item}
                type="button"
                onClick={() =>
                  setCategory(item)
                }
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  category ===
                  item
                    ? "bg-white text-ink-950"
                    : "border border-white/10 text-slate-400 hover:border-emerald-400/40 hover:text-emerald-300"
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        {category ===
          "Other" &&
          otherService && (
            <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-start gap-3">
                <ServiceBrandIcon
                  slug="other"
                  name="Other / Custom Service"
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">
                    Other / Custom Service
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Use this option when the platform you need is not listed.
                  </p>

                  <input
                    value={
                      customName
                    }
                    onChange={(
                      event,
                    ) =>
                      setCustomName(
                        event.target.value,
                      )
                    }
                    placeholder="Example: MyApp"
                    aria-label="Custom service name"
                    className="mt-3 w-full rounded-xl border border-white/10 bg-ink-900 px-3 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-400/50 focus:outline-none"
                  />

                  <Link
                    href={ctaHref(
                      "other",
                    )}
                    className="mt-3 inline-flex rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-ink-950 transition hover:brightness-110"
                  >
                    Use custom service
                  </Link>

                  {customName.trim() && (
                    <p className="mt-2 text-xs text-slate-500">
                      Requested service:{" "}
                      <span className="font-semibold text-slate-300">
                        {
                          customName.trim()
                        }
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>

      {view ===
      "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleServices.map(
            (service) => {
              const offer =
                offerMap.get(
                  `${service.id}:${countryId}`,
                );

              const price =
                offer?.priceCents ??
                service.minPriceCents;

              return (
                <div
                  key={service.id}
                  className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/30"
                >
                  <div
                    className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition group-hover:opacity-40"
                    style={{
                      background:
                        service.accent,
                    }}
                  />

                  <div className="relative flex items-start justify-between">
                    <ServiceBrandIcon
                      slug={
                        service.slug
                      }
                      name={
                        service.name
                      }
                    />

                    {service.popular && (
                      <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/25">
                        Popular
                      </span>
                    )}
                  </div>

                  <h3 className="mt-4 text-base font-bold text-white">
                    {
                      service.name
                    }
                  </h3>

                  <p className="text-xs text-slate-500">
                    {
                      service.category
                    }
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-xl font-extrabold text-white">
                        {formatCurrency(
                          price,
                          currency,
                        )}
                      </p>

                      {currency !==
                        "USD" && (
                        <p className="text-[11px] font-medium text-slate-500">
                          Base USD:{" "}
                          {usd(
                            price,
                          )}
                        </p>
                      )}
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <p className="font-semibold text-emerald-300">
                        {
                          offer?.successRate ??
                          95
                        }
                        % success
                      </p>

                      <p>
                        {(
                          offer?.stock ??
                          0
                        ).toLocaleString()}{" "}
                        numbers
                      </p>
                    </div>
                  </div>

                  <Link
                    href={ctaHref(
                      service.slug,
                    )}
                    className="mt-4 block rounded-xl border border-emerald-400/25 bg-emerald-400/10 py-2.5 text-center text-sm font-bold text-emerald-300 transition hover:bg-emerald-400 hover:text-ink-950"
                  >
                    Rent{" "}
                    {
                      activeCountry?.flag ??
                      ""
                    }{" "}
                    number
                  </Link>
                </div>
              );
            },
          )}

          {visibleServices.length ===
            0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <p className="font-bold text-white">
                No services match "{query}".
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Choose Other / Custom Service to continue.
              </p>

              <button
                type="button"
                onClick={() => {
                  setCategory(
                    "Other",
                  );
                  setQuery("");
                }}
                className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-ink-950"
              >
                Use custom service
              </button>
            </div>
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

                {countries.map(
                  (country) => (
                    <th
                      key={
                        country.id
                      }
                      className="whitespace-nowrap px-3 py-3 text-center text-xs font-bold text-slate-400"
                      title={
                        country.name
                      }
                    >
                      <span className="mr-1">
                        {
                          country.flag
                        }
                      </span>
                      {
                        country.code
                      }
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {visibleServices.map(
                (service) => (
                  <tr
                    key={
                      service.id
                    }
                    className="border-b border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-ink-900/95 px-4 py-3 font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <ServiceBrandIcon
                          slug={
                            service.slug
                          }
                          name={
                            service.name
                          }
                          size="sm"
                        />
                        <span>
                          {
                            service.name
                          }
                        </span>
                      </span>
                    </td>

                    {countries.map(
                      (country) => {
                        const offer =
                          offerMap.get(
                            `${service.id}:${country.id}`,
                          );

                        return (
                          <td
                            key={
                              country.id
                            }
                            className="px-3 py-3 text-center"
                          >
                            {offer ? (
                              <Link
                                href={
                                  authed
                                    ? `/dashboard?service=${service.slug}&country=${country.code}`
                                    : `/register?next=${encodeURIComponent(`/dashboard?service=${service.slug}&country=${country.code}`)}`
                                }
                                className="font-semibold text-slate-200 transition hover:text-emerald-300"
                              >
                                {formatCurrency(
                                  offer.priceCents,
                                  currency,
                                )}
                              </Link>
                            ) : (
                              <span className="text-slate-700">
                                â€”
                              </span>
                            )}
                          </td>
                        );
                      },
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}