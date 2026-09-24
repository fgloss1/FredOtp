import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/LogoutButton";
import { IdleSessionGuard } from "@/components/IdleSessionGuard";
import { WalletModalTrigger } from "@/components/dashboard/WalletModalTrigger";
import { getCurrentUser } from "@/lib/auth";
import { ngn, usd } from "@/lib/format";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/dashboard", label: "Rent a number", icon: "📲" },
  { href: "/dashboard/orders", label: "My rentals", icon: "🧾" },
  { href: "/dashboard/wallet", label: "Wallet", icon: "💳" },
  { href: "/pricing", label: "Price list", icon: "🏷️" },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="min-h-screen">
      <IdleSessionGuard />

      <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
                Wallet
              </p>
              <p className="text-sm font-black leading-none text-emerald-300">
                {usd(user.balanceCents)}{" "}
                <span className="text-[10px] font-semibold text-emerald-400/60">
                  · {ngn(user.balanceCents)}
                </span>
              </p>
            </div>
            <WalletModalTrigger
              balanceCents={user.balanceCents}
              mode="topup"
              className="rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-4 py-2 text-sm font-bold text-ink-950 transition hover:brightness-110"
            />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-600">
              {user.name}
            </p>
            {LINKS.map((link) =>
              link.label === "Wallet" ? (
                <WalletModalTrigger
                  key={link.href}
                  balanceCents={user.balanceCents}
                  label={`${link.icon} ${link.label}`}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ),
            )}
            <div className="card mt-6 p-4">
              <p className="text-xs font-bold text-white">Need bulk numbers?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Agency plans unlock priority routes and 10% bonus credit on every $50+ top-up.
              </p>
              <Link
                href="/dashboard/wallet?amount=20000"
                className="mt-3 block rounded-lg border border-emerald-400/25 py-2 text-center text-[11px] font-bold text-emerald-300 hover:bg-emerald-400/10"
              >
                See agency pack
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="sticky bottom-0 z-40 flex border-t border-white/10 bg-ink-950/95 backdrop-blur lg:hidden">
        {LINKS.slice(0, 3).map((link) =>
          link.label === "Wallet" ? (
            <WalletModalTrigger
              key={link.href}
              balanceCents={user.balanceCents}
              label={`${link.icon} ${link.label}`}
              className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-semibold text-slate-400"
            />
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-3 text-[11px] font-semibold text-slate-400"
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
