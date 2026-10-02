"use client";

import Link from "next/link";
import { useEffect, useState, useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import CurrencyToggle from "@/components/CurrencyToggle";
import Footer from "@/components/Footer";
import IdleTimer from "@/components/IdleTimer";

export default function AntiFlashLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

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
      supabase.auth.getUser().then(({ data, error }) => {
        const user = data?.user;

        if (error || !user) {
          setAuthChecking(true);
          router.replace("/login");
          return;
        }

        if (user && user.email) {
          setFullEmail(user.email);
          setUserEmail(user.email.split("@")[0]);

          supabase
            .from("profiles")
            .select("balance, role")
            .eq("id", user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                if (profile.balance !== undefined) setUserBalance(Number(profile.balance));
                if (profile.role) setUserRole(profile.role);
              }
              setAuthChecking(false);
            })
            .catch(() => setAuthChecking(false));
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
    { href: "/dashboard", label: "Rent a number", icon: "📞", adminOnly: false },
    { href: "/dashboard/sms", label: "Phone", icon: "📱", adminOnly: false },
    { href: "/dashboard/rentals", label: "My rentals", icon: "📑", adminOnly: false },
    { href: "/dashboard/wallet", label: "Wallet & Top Up", icon: "💳", adminOnly: false },
    { href: "/dashboard/otp", label: "Price list", icon: "🏷️", adminOnly: false },
    { href: "/dashboard/support", label: "Help & Support", icon: "💬", adminOnly: false },
    { href: "/admin/rentals", label: "Admin Desk", icon: "🛠️", adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || userRole === "admin");

  const mobileBottomNavItems = [
    { href: "/dashboard", label: "Rent", icon: "📞" },
    { href: "/dashboard/sms", label: "Phone", icon: "📱" },
    { href: "/dashboard/rentals", label: "Rentals", icon: "📑" },
    { href: "/dashboard/wallet", label: "Wallet", icon: "💳" },
    { href: "/dashboard/otp", label: "Prices", icon: "🏷️" },
  ];

  // Sidebar link classes: strong contrast in light mode, same emerald active in both
  const sidebarLinkClass = (href: string) => {
    const active = pathname === href;
    if (active) {
      return darkMode
        ? "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow"
        : "bg-emerald-500/15 text-emerald-700 font-bold border border-emerald-500/40 shadow-sm";
    }
    return darkMode
      ? "text-gray-300 hover:bg-[#0f172a] hover:text-white"
      : "text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 font-semibold";
  };

  const mobileDrawerLinkClass = (href: string) => {
    const active = pathname === href;
    if (active) {
      return "bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30";
    }
    return "text-gray-300 hover:bg-[#152035]";
  };

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-[#070b14] text-white" : "bg-slate-100 text-slate-900"} pb-20 md:pb-0`}
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
                        {userRole === "admin" ? "🛠️ Administrator" : "✓ Verified User"}
                      </span>
                    </div>
                    <Link
                      href="/dashboard/rentals"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className={`block px-3 py-2 text-xs rounded-xl font-medium ${
                        darkMode ? "text-gray-300 hover:bg-[#152035]" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      📑 My Rentals
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
                        🛠️ Admin Desk
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      🚪 Sign Out
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

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 md:py-8 flex gap-8">
        {/* Desktop sidebar — fixed contrast */}
        <aside className="hidden md:block w-56 shrink-0 space-y-6">
          <nav className="space-y-1 sticky top-24">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${sidebarLinkClass(
                  item.href
                )}`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 w-full overflow-hidden">{children}</main>
      </div>

      <Footer />

      {isMobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer stays dark for contrast on small screens */}
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
              ✕
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileDrawerOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${mobileDrawerLinkClass(
                  item.href
                )}`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs py-3 rounded-xl transition-all"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

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
              <span className={`text-lg transition-transform ${isActive ? "scale-110" : ""}`}>{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}