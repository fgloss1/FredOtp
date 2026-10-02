"use client";

import { useState, useEffect, useRef } from "react";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rate: number; // vs 1 USD
}

export const CURRENCIES: Record<string, Currency> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", flag: "https://flagcdn.com/w40/us.png", rate: 1 },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira", flag: "https://flagcdn.com/w40/ng.png", rate: 1500 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", flag: "https://flagcdn.com/w40/gb.png", rate: 0.79 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", flag: "https://flagcdn.com/w40/de.png", rate: 0.92 },
  GHS: { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", flag: "https://flagcdn.com/w40/gh.png", rate: 14.5 },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling", flag: "https://flagcdn.com/w40/ke.png", rate: 129 },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", flag: "https://flagcdn.com/w40/za.png", rate: 18.6 },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "https://flagcdn.com/w40/ca.png", rate: 1.37 },
};

export default function CurrencyToggle() {
  const [selectedCode, setSelectedCode] = useState<string>("USD");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedCurrency = localStorage.getItem("nava-currency");
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setSelectedCode(savedCurrency);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCurrency = (code: string) => {
    setSelectedCode(code);
    localStorage.setItem("nava-currency", code);
    window.dispatchEvent(new CustomEvent("nava-currency-change", { detail: code }));
    setIsOpen(false);
  };

  const current = CURRENCIES[selectedCode] || CURRENCIES.USD;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
      >
        <img src={current.flag} alt={current.code} className="w-4 h-2.5 object-cover rounded-sm shadow-sm" />
        <span className="font-mono text-emerald-400">{current.symbol}</span>
        <span className="text-[11px] font-bold">{current.code}</span>
        <span className="text-[9px] text-gray-400 ml-0.5">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d1527] border border-slate-700 rounded-2xl p-1.5 shadow-2xl z-50 animate-fadeIn space-y-0.5">
          <p className="text-[9px] font-bold uppercase text-gray-400 px-2.5 py-1 tracking-wider">
            Select Display Currency
          </p>
          {Object.values(CURRENCIES).map((c) => {
            const isSelected = selectedCode === c.code;
            return (
              <div
                key={c.code}
                onClick={() => handleSelectCurrency(c.code)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all hover:bg-emerald-500/10 hover:text-white ${
                  isSelected ? "bg-emerald-500/15 font-bold text-emerald-400" : "text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <img src={c.flag} alt={c.code} className="w-4 h-2.5 object-cover rounded-sm shadow-sm" />
                  <span>{c.name}</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-gray-400">
                  {c.symbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}