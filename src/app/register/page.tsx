import Link from "next/link";
import { UiIcon } from "@/components/UiIcon";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PERKS = [
  "Fast access to virtual numbers",
  "16 country pools including 🇳🇬 Nigeria",
  "Automatic refunds when no SMS arrives",
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-14">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-2">
        <div className="hidden flex-col justify-center lg:flex">
          <Logo />
          <h2 className="mt-6 text-3xl font-black leading-tight text-white">
            Start renting numbers in under a minute
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            One wallet, 30+ services and 16 countries. Verify Match, Zoosk, Gmail, PayPal, Venmo and
            more with disposable numbers that are retired after every use.
          </p>
          <ul className="mt-6 space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400/15 text-xs text-emerald-300">
                  <UiIcon name="check" className="h-4 w-4 text-emerald-300" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="mt-8 text-sm font-semibold text-emerald-300 hover:underline">
            View the full price list →
          </Link>
        </div>

        <div>
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="card p-7">
            <h1 className="text-2xl font-black text-white">Create your account</h1>
            <p className="mt-1 text-sm text-slate-400">Free to join - Add funds whenever you are ready.</p>
            <div className="mt-6">
              <AuthForm mode="register" next={next} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

