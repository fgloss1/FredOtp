import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-mint-400 to-brand-500 text-base font-black text-ink-950 shadow-lg shadow-emerald-500/20">
        F
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-ink-950" />
      </span>
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight text-white">
          Fred<span className="bg-gradient-to-r from-mint-400 to-brand-400 bg-clip-text text-transparent">OTP</span>
        </span>
      )}
    </Link>
  );
}
