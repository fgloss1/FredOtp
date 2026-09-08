import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { usd } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#how", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-400 transition hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <span className="hidden rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 sm:block">
                {usd(user.balanceCents)}
              </span>
              <Link
                href="/dashboard"
                className="rounded-lg bg-gradient-to-r from-mint-500 to-brand-500 px-4 py-2 text-sm font-bold text-ink-950 transition hover:brightness-110"
              >
                Dashboard
              </Link>
              <LogoutButton className="hidden sm:block" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="glow-btn rounded-lg bg-gradient-to-r from-mint-500 to-brand-500 px-4 py-2 text-sm font-bold text-ink-950 transition hover:brightness-110"
              >
                Get a number
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
