"use client";

import Link from "next/link";
import { useEffect, useState, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import Footer from "@/components/Footer";
import IdleTimer from "@/components/IdleTimer";

// ─── GLASS 3D ICON HELPER FOR NAV ───
function GlassIcon({ name, isActive = false }: { name: string; isActive?: boolean }) {
  const glow = isActive ? "drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "drop-shadow-lg";

  switch (name) {
    case "phone":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-cyan-300/40 to-emerald-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "chat":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-purple-300/40 to-pink-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="12" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "store":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-orange-300/40 to-amber-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "history":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-amber-300/40 to-yellow-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "wallet":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-green-300/40 to-emerald-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 01-2-2 2 2 0 012-2h12v4" />
              <path d="M4 6v12a2 2 0 002 2h14v-4" />
              <path d="M18 12a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "tag":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-fuchsia-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-pink-300/40 to-fuchsia-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <circle cx="7" cy="7" r="1.5" fill="currentColor" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "support":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-blue-300/40 to-cyan-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    case "admin":
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-red-300/40 to-rose-400/40 rounded-lg" />
          <div className="relative w-full h-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          {isActive && <div className="absolute inset-0 rounded-xl bg-emerald-400/30 animate-pulse" />}
        </div>
      );
    default:
      return (
        <div className={`relative w-9 h-9 rounded-xl ${glow} transition-all duration-300`}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-gray-500 rounded-xl opacity-90" />
          <div className="absolute inset-0.5 bg-gradient-to-br from-slate-300/40 to-gray-400/40 rounded-lg" />
        </div>
      );
  }
}

export default function AntiFlashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPhoneInbox = pathname === "/dashboard/sms/inbox";

  const [authChecking, setAuthChecking] = useState(true);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nava-theme");
      return saved !== "light";
    }
    return true;
  });

  const [userEmail, setUserEmail] = useState("User");
  const [fullEmail, setFullEmail] = useState("user@example.com");
  const [userBalance, setUserBalance] = useState<number>(0.0);
  const [userRole, setUserRole] = useState<string>("user");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const applyThemeToDOM = (isDark: boolean) => {
    if (typeof document !== "undefined") {
      const bg = isDark ? "#070b14" : "#f1f5f9";
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
    }
  };

  useLayoutEffect(() => {
    applyThemeToDOM(darkMode);
  }, [darkMode]);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem("nava-theme");
      setDarkMode(savedTheme !== "light");
      applyThemeToDOM(savedTheme !== "light");
    };

    checkTheme();
    window.addEventListener("nava-theme-change", checkTheme);

    import("@/lib/supabase").then(({ supabase }) => {
      supabase.auth.getUser().then(async ({ data, error }) => {
        const user = data?.user;

        if (error || !user) {
          setAuthChecking(true);
          router.replace("/login");
          return;
        }

        if (user && user.email) {
          setFullEmail(user.email);
          setUserEmail(user.email.split("@")[0]);

          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("balance, role")
              .eq("id", user.id)
              .single();

            if (profile) {
              if (profile.balance !== undefined) setUserBalance(Number(profile.balance));
              if (profile.role) setUserRole(profile.role);
            }
          } catch (e) {
            console.error("Profile load error:", e);
          } finally {
            setAuthChecking(false);
          }
        } else {
          setAuthChecking(false);
        }
      });
    });

    return () => window.removeEventListener("nava-theme-change", checkTheme);
  }, [router]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      const { supabase } = await import("@/lib/supabase");
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Signout error:", e);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black font-black flex items-center justify-center text-2xl shadow-xl animate-pulse">
          N
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-gray-400">Authenticating Session...</span>
        </div>
      </div>
    );
  }

  const allNavItems = [
    { href: "/dashboard", label: "Rent a number", icon: "phone", adminOnly: false },
    { href: "/dashboard/sms", label: "Phone", icon: "chat", adminOnly: false },
    { href: "/dashboard/sms/inbox", label: "Messages", icon: "chat", adminOnly: false },
    { href: "/dashboard/rentals", label: "Rental Services", icon: "store", adminOnly: false },
    { href: "/dashboard/history", label: "History", icon: "history", adminOnly: false },
    { href: "/dashboard/wallet", label: "Wallet & Top Up", icon: "wallet", adminOnly: false },
    { href: "/dashboard/otp", label: "Price list", icon: "tag", adminOnly: false },
    { href: "/dashboard/support", label: "Help & Support", icon: "support", adminOnly: false },
    { href: "/admin/rentals", label: "Admin Desk", icon: "admin", adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || userRole === "admin");

  const mobileBottomNavItems = [
    { href: "/dashboard", label: "Rent", icon: "phone" },
    { href: "/dashboard/sms", label: "Phone", icon: "chat" },
    { href: "/dashboard/rentals", label: "Services", icon: "store" },
    { href: "/dashboard/wallet", label: "Wallet", icon: "wallet" },
    { href: "/dashboard/otp", label: "Prices", icon: "tag" },
  ];

  const sidebarLinkClass = (href: string) => {
    const active = pathname === href;
    if (active) {
      return darkMode
        ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] backdrop-blur-sm"
        : "bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/40 shadow-sm";
    }
    return darkMode
      ? "text-gray-300 hover:bg-[#0f172a]/50 hover:text-white border border-transparent"
      : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900 font-semibold border border-transparent";
  };

  const mobileDrawerLinkClass = (href: string) => {
    const active = pathname === href;
    if (active) {
      return "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 backdrop-blur-sm";
    }
    return "text-gray-300 hover:bg-[#152035]/50 border border-transparent";
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-[#070b14] text-white" : "bg-slate-100 text-slate-900"} ${isPhoneInbox ? "pb-0" : "pb-20 md:pb-0"}`}
    >
      <IdleTimer />

      <header
        className={`border-b sticky top-0 z-40 backdrop-blur-md ${
          darkMode ? "bg-[#090e1a]/95 border-slate-800" : "bg-white/95 border-slate-200 shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center text-lg shadow-lg">
              N
            </span>
            <span className="text-xl font-black tracking-wider text-emerald-500">NAVA</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <CurrencyToggle />
            </div>

            <Link
              href="/dashboard/wallet"
              className={`border px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs transition-all shrink-0 ${
                darkMode
                  ? "bg-[#0f172a] border-slate-800 hover:border-emerald-500/50"
                  : "bg-white border-slate-200 hover:border-emerald-500/50 shadow-sm"
              }`}
            >
              <span className={`text-[10px] font-bold hidden xs:inline ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                WALLET
              </span>
              <span className="font-extrabold text-emerald-500">${userBalance.toFixed(2)}</span>
            </Link>

            {/* Desktop profile dropdown */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  darkMode
                    ? "bg-[#152035] border-slate-700/80 text-gray-200 hover:border-slate-600"
                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center uppercase font-black text-xs">
                  {userEmail.slice(0, 2)}
                </div>
                <span className="max-w-[90px] truncate">{userEmail}</span>
                <span className={`text-[10px] ${darkMode ? "text-gray-400" : "text-slate-400"}`}>▼</span>
              </button>

              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                  <div
                    className={`absolute right-0 top-full mt-2 w-56 border rounded-2xl p-2 space-y-1 z-50 shadow-2xl ${
                      darkMode ? "bg-[#0d1526] border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        darkMode ? "bg-[#152035]" : "bg-slate-50 border border-slate-100"
                      }`}
                    >
                      <span className={`text-[10px] block font-bold uppercase ${darkMode ? "text-gray-400" : "text-slate-500"}`}>
                        Signed in as
                      </span>
                      <span className={`font-bold block truncate ${darkMode ? "text-white" : "text-slate-900"}`}>
                        {fullEmail}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                        {userRole === "admin" ? "️ Administrator" : "✓ Verified User"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard/rentals"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-3 py-2 text-xs rounded-xl font-medium ${
                        darkMode ? "text-gray-300 hover:bg-[#152035]" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      📑 Rental Services
                    </Link>
                    <Link
                      href="/dashboard/history"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-3 py-2 text-xs rounded-xl font-medium ${
                        darkMode ? "text-gray-300 hover:bg-[#152035]" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      🕒 History
                    </Link>
                    <Link
                      href="/dashboard/wallet"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-3 py-2 text-xs rounded-xl font-medium ${
                        darkMode ? "text-gray-300 hover:bg-[#152035]" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      💳 Wallet & Top Up
                    </Link>
                    {userRole === "admin" && (
                      <Link
                        href="/admin/rentals"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="block px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-500/10 rounded-xl"
                      >
                        ️ Admin Desk
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                       Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile: open drawer */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={`md:hidden flex items-center gap-1.5 border px-2 py-1.5 rounded-xl text-xs font-bold ${
                darkMode
                  ? "bg-[#152035] border-slate-700/80 text-gray-200"
                  : "bg-white border-slate-200 text-slate-800 shadow-sm"
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center uppercase font-black text-xs">
                {userEmail.slice(0, 2)}
              </div>
              <span className={`text-[10px] ${darkMode ? "text-gray-400" : "text-slate-400"}`}>☰</span>
            </button>
          </div>
        </div>
      </header>

      <div className={`max-w-7xl mx-auto px-3 sm:px-4 flex gap-8 ${isPhoneInbox ? "py-0 md:py-0" : "py-6 md:py-8"}`}>
        <aside className="hidden md:block w-56 shrink-0 space-y-6">
          <nav className="space-y-1 sticky top-24">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all backdrop-blur-sm ${sidebarLinkClass(item.href)}`}
                >
                  <GlassIcon name={item.icon} isActive={isActive} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 w-full overflow-hidden">{children}</main>
      </div>

      {!isPhoneInbox && <Footer />}

      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed top-0 right-0 bottom-0 w-72 bg-[#0d1526] border-l border-slate-800 z-50 p-5 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-2xl text-white ${
          isMobileDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black uppercase shrink-0">
                {userEmail.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block truncate">{fullEmail}</span>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 mt-0.5">
                  {userRole === "admin" ? "🛠️ Administrator" : "✓ Verified Account"}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="w-8 h-8 rounded-full bg-[#152035] text-gray-400 hover:text-white flex items-center justify-center text-xs font-bold shrink-0"
            >

            </button>
          </div>

          <div className="bg-[#152035] border border-slate-800 rounded-xl p-3 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Wallet Balance</span>
              <span className="text-emerald-400 font-extrabold text-sm">${userBalance.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/80">
              <ThemeToggle />
              <CurrencyToggle />
            </div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all backdrop-blur-sm ${mobileDrawerLinkClass(item.href)}`}
                >
                  <GlassIcon name={item.icon} isActive={isActive} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs py-3 rounded-xl transition-all"
          >
            <span></span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {!isPhoneInbox && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090e1a]/95 backdrop-blur-lg border-t border-slate-800/80 flex items-center justify-around h-16 px-1 text-white">
        {mobileBottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all ${
                isActive ? "text-emerald-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <GlassIcon name={item.icon} isActive={isActive} />
              <span className="mt-0.5">{item.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />}
            </Link>
          );
        })}
      </nav>
      )}
    </div>
  );
}
