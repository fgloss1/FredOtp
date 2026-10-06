'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ServiceLogo from '@/components/ServiceLogo';
import CountryFlag from '@/components/CountryFlag';
import { getServiceLogo } from '@/lib/service-logo';

export interface GlobalService {
  slug: string;
  displayName: string;
  logoUrl: string | null;
  totalAvailability: number;
}

export interface ServiceCountry {
  slug: string;
  displayName: string;
  countryCode: string | null;
  availability: number;
  navaPrice: number;
}

export interface ActiveOrder {
  orderId: string;
  phoneNumber: string;
  country: string;
  service: string;
  price: number;
  status: 'pending' | 'received' | 'completed' | 'canceled' | 'expired' | 'banned' | 'refunded';
  code: string | null;
  sms: string | null;
  expiresAt: string;
}

interface OtpCatalogProps {
  onBalanceRefresh?: () => void;
  userBalance?: number;
}

export default function OtpCatalog({ onBalanceRefresh, userBalance }: OtpCatalogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [services, setServices] = useState<GlobalService[]>([]);
  const [countries, setCountries] = useState<ServiceCountry[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [selectedService, setSelectedService] = useState<GlobalService | null>(null);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const [serviceSearch, setServiceSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countrySort, setCountrySort] = useState<'popularity' | 'price'>('popularity');

  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/otp/catalog/services');
        if (!res.ok) throw new Error('Failed to load apps');
        const data = await res.json();
        setServices(
          (data.services || []).map((service: Omit<GlobalService, 'logoUrl'>) => ({
            ...service,
            logoUrl: getServiceLogo(service.displayName, service.slug),
          }))
        );
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to connect to live catalog.');
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  const handleServiceSelect = useCallback(async (service: GlobalService) => {
    setSelectedService(service);
    setServiceSearch('');
    setCountrySearch('');
    setExpandedCountry(null);
    setIsLoadingCountries(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/otp/catalog/countries?service=${encodeURIComponent(service.slug)}`);
      if (!res.ok) throw new Error('Failed to load countries');
      const data = await res.json();
      setCountries(data.countries || []);
    } catch (err: any) {
      setErrorMessage(err.message);
      setSelectedService(null);
    } finally {
      setIsLoadingCountries(false);
    }
  }, []);

  const handleClearService = () => {
    setSelectedService(null);
    setCountries([]);
    setExpandedCountry(null);
  };

  async function handlePurchase(country: ServiceCountry) {
    if (!selectedService) return;
    setIsPurchasing(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: country.slug,
          service: selectedService.slug,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Order purchase failed');
      }

      setActiveOrder({
        orderId: data.orderId,
        phoneNumber: data.phoneNumber,
        country: data.country,
        service: data.service,
        price: data.price,
        status: 'pending',
        code: null,
        sms: null,
        expiresAt: data.expiresAt,
      });
      if (onBalanceRefresh) onBalanceRefresh();
      startPolling(data.orderId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete order.');
      setExpandedCountry(null);
    } finally {
      setIsPurchasing(false);
    }
  }

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (orderId: string) => {
      stopPolling();
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/otp?orderId=${encodeURIComponent(orderId)}`);
          if (!res.ok) return;
          const data = await res.json();

          if (data.success) {
            setActiveOrder((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: data.status,
                code: data.code || prev.code,
                sms: data.sms || prev.sms,
              };
            });

            if (['completed', 'canceled', 'expired', 'banned', 'refunded'].includes(data.status)) {
              stopPolling();
              if (onBalanceRefresh) onBalanceRefresh();
            }
          }
        } catch {}
      }, 4000);
    },
    [stopPolling, onBalanceRefresh]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  async function handleCancelOrder() {
    if (!activeOrder || isCanceling) return;
    setIsCanceling(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/otp/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: activeOrder.orderId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      stopPolling();
      setActiveOrder((prev) => (prev ? { ...prev, status: 'canceled' } : null));
      if (onBalanceRefresh) onBalanceRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to cancel order.');
    } finally {
      setIsCanceling(false);
    }
  }

  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase();
    return services.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const sortedAndFilteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase();
    const filtered = countries.filter((c) => c.displayName.toLowerCase().includes(q));
    
    return filtered.sort((a, b) => {
      if (countrySort === 'price') return a.navaPrice - b.navaPrice;
      return b.availability - a.availability; // popularity/stock
    });
  }, [countries, countrySearch, countrySort]);

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-2xl shadow-xl overflow-hidden text-slate-100 flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#161f33]">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          Live OTP Activation
          <span className="relative flex h-2.5 w-2.5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </h2>
      </div>

      <div className="p-5 sm:p-6 flex-1 bg-[#0b1120]">
        {errorMessage && (
          <div className="mb-5 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-300 flex justify-between items-center">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {activeOrder ? (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="p-5 rounded-2xl border border-gray-800 bg-[#161f33] shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {activeOrder.service}
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">{activeOrder.country.toUpperCase()}</span>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                    activeOrder.status === 'received' || activeOrder.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : activeOrder.status === 'canceled' || activeOrder.status === 'refunded'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400 animate-pulse'
                  }`}
                >
                  {activeOrder.status}
                </span>
              </div>

              <div className="mb-5">
                <label className="text-[10px] uppercase text-gray-500 font-bold mb-1.5 block">
                  Verification Number
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeOrder.phoneNumber}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-lg font-mono text-white tracking-widest focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrder.phoneNumber);
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 2000);
                    }}
                    className="px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 transition-colors"
                  >
                    {copiedPhone ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-5 bg-gray-900 rounded-xl border border-gray-800 text-center">
                <span className="text-[10px] uppercase text-gray-500 font-bold mb-2 block">
                  Incoming SMS Code
                </span>
                {activeOrder.code ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl font-mono font-black text-emerald-400 tracking-widest">
                      {activeOrder.code}
                    </span>
                    {activeOrder.sms && (
                      <p className="text-xs text-gray-500 mt-2 bg-gray-950 p-2 rounded w-full text-left font-mono">
                        {activeOrder.sms}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-400">Listening for SMS...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              {activeOrder.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isCanceling}
                  className="px-4 py-2.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  {isCanceling ? 'Refunding...' : 'Cancel & Refund'}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopPolling();
                  setActiveOrder(null);
                  handleClearService();
                }}
                className="ml-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg transition-colors border border-gray-700"
              >
                Buy Another Number
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* 1. SELECT SERVICE */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-gray-300">1. Select service</h3>

                {selectedService ? (
                  <div className="inline-flex items-center gap-2 bg-[#161f33] border border-gray-700 pr-4 pl-1.5 py-1.5 rounded-full shadow-sm">
                    <button
                      type="button"
                      onClick={handleClearService}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      aria-label="Change service"
                    >
                      ✕
                    </button>
                    <div className="w-5 h-5 bg-slate-800 rounded-md flex items-center justify-center overflow-hidden shrink-0">
                      <ServiceLogo
                        src={selectedService.logoUrl}
                        name={selectedService.displayName}
                        size={14}
                      />
                    </div>
                    <span className="text-sm font-bold text-white">
                      {selectedService.displayName}
                    </span>
                  </div>
                ) : (
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Find service..."
                      className="w-full pl-9 pr-4 py-2 bg-[#161f33] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                )}
              </div>

              {!selectedService &&
                (isLoadingServices ? (
                  <div className="py-10 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6 max-h-[320px] overflow-y-auto custom-scrollbar pr-2 pb-2">
                    {filteredServices.map((s) => (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => handleServiceSelect(s)}
                        className="flex flex-col items-center justify-start gap-2 group outline-none active:scale-95 transition-transform cursor-pointer"
                      >
                        <div className="w-[60px] h-[60px] bg-slate-800 border border-slate-700/50 rounded-[14px] shadow-md flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                          <ServiceLogo
                            src={s.logoUrl}
                            name={s.displayName}
                            size={30}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-300 group-hover:text-white truncate w-full text-center px-1">
                          {s.displayName}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
            </div>

            {/* 2. SELECT COUNTRY */}
            {selectedService && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <h3 className="text-sm font-bold text-gray-300 mb-4">2. Select country</h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Find country..."
                      className="w-full pl-9 pr-4 py-2.5 bg-[#161f33] border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="relative min-w-[150px]">
                    <select
                      value={countrySort}
                      onChange={(e) => setCountrySort(e.target.value as 'popularity' | 'price')}
                      className="w-full appearance-none pl-4 pr-8 py-2.5 bg-[#161f33] border border-gray-800 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="popularity">Sort by stock</option>
                      <option value="price">Sort by price</option>
                    </select>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 text-xs">
                      ▼
                    </span>
                  </div>
                </div>

                {isLoadingCountries ? (
                  <div className="py-10 text-center">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 pb-2">
                    {sortedAndFilteredCountries.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-500">
                        No countries match your search.
                      </div>
                    ) : (
                      sortedAndFilteredCountries.map((c) => (
                        <div
                          key={c.slug}
                          className="flex flex-col bg-[#161f33] border border-gray-800 rounded-xl overflow-hidden transition-all"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCountry(expandedCountry === c.slug ? null : c.slug)
                            }
                            className="flex items-center justify-between p-3.5 hover:bg-gray-800/50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3.5">
                              <CountryFlag countryCode={c.countryCode} countryName={c.displayName} />
                              <span className="text-sm font-bold text-gray-200">
                                {c.displayName}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-white">
                                from ${c.navaPrice.toFixed(2)}
                              </p>
                              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                {c.availability.toLocaleString()} numbers
                              </p>
                            </div>
                          </button>

                          {expandedCountry === c.slug && (
                            <div className="p-3.5 bg-[#0d1320] border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
                              <span className="text-xs text-gray-400">
                                Wallet:{' '}
                                <span className="text-white font-mono">
                                  ${userBalance?.toFixed(2) || '0.00'}
                                </span>
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedCountry(null)}
                                  className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePurchase(c)}
                                  disabled={isPurchasing}
                                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  {isPurchasing
                                    ? 'Buying...'
                                    : `Buy for $${c.navaPrice.toFixed(2)}`}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}