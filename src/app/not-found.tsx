import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <p className="mt-10 text-6xl font-black text-white">404</p>
      <h1 className="mt-2 text-xl font-bold text-white">This number is out of service</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The page you were looking for does not exist. Head back to the catalog and rent a number
        instead.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/"
          className="glow-btn rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-5 py-3 text-sm font-extrabold text-ink-950"
        >
          Back home
        </Link>
        <Link
          href="/pricing"
          className="rounded-xl border border-white/12 px-5 py-3 text-sm font-bold text-white transition hover:border-emerald-400/40"
        >
          View pricing
        </Link>
      </div>
    </main>
  );
}
