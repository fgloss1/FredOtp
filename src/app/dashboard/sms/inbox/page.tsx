"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Page() {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setDarkMode(localStorage.getItem("nava-theme") !== "light");
    };
    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);
    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, []);

  const theme = darkMode
    ? {
        card: "bg-[#0b1120] border border-slate-800 shadow-md",
        text: "text-white",
        muted: "text-gray-400",
      }
    : {
        card: "bg-white border-2 border-slate-300 shadow-sm",
        text: "text-slate-900",
        muted: "text-slate-600 font-medium",
      };

  return (
    <div className={`space-y-6 ${theme.text} font-sans`}>
      <div>
        <Link
          href="/dashboard/sms"
          className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300"
        >
          ← {backLabel}
        </Link>
        <h1 className="mt-3 text-2xl font-bold">{icon} {title}</h1>
        <p className={`${theme.muted} mt-1 text-xs`}>{subtitle}</p>
      </div>

      <div className={`${theme.card} rounded-3xl p-8 sm:p-10`}>
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-3xl">
            {icon}
          </div>
          <h2 className="mt-5 text-xl font-bold">NAVA Phone workspace</h2>
          <p className={`${theme.muted} mt-2 text-xs leading-relaxed`}>
            This workspace is now connected to the Phone section. The live {title.toLowerCase()} controls will be enabled after number provisioning and the Telnyx integration are completed.
          </p>

          <div className="mt-6 rounded-2xl border border-pink-500/30 bg-pink-950/30 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
              Coming next
            </p>
            <p className={`${theme.muted} mt-1 text-xs`}>
              Number provisioning → service setup → live {title.toLowerCase()}.
            </p>
          </div>

          <Link
            href="/dashboard/sms"
            className="mt-6 inline-flex rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20"
          >
            Back to NAVA Phone
          </Link>
        </div>
      </div>
    </div>
  );
}
