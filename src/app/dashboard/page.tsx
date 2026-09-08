import { RentConsole } from "@/components/dashboard/RentConsole";
import { requireUser } from "@/lib/auth";
import { usd } from "@/lib/format";
import { getCatalog, getUserRentals } from "@/lib/queries";
import { syncActiveRentals } from "@/lib/rental-engine";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; country?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  await syncActiveRentals(user.id);
  const [catalog, rentals] = await Promise.all([getCatalog(), getUserRentals(user.id)]);

  const received = rentals.filter((rental) => rental.status === "received");
  const spent = rentals
    .filter((rental) => rental.status === "received")
    .reduce((sum, rental) => sum + rental.priceCents, 0);
  const successRate =
    rentals.length > 0 ? Math.round((received.length / rentals.length) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Hey {user.name.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">
          Rent a disposable number and your OTP lands here automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="Wallet" value={usd(user.balanceCents)} tone="emerald" />
        <MiniStat label="Codes received" value={String(received.length)} />
        <MiniStat label="Total spent" value={usd(spent)} />
        <MiniStat label="Success rate" value={`${successRate}%`} />
      </div>

      <RentConsole
        catalog={catalog}
        initialRentals={rentals}
        initialBalanceCents={user.balanceCents}
        defaultServiceSlug={params.service}
        defaultCountryCode={params.country}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald";
}) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-black ${tone === "emerald" ? "text-emerald-300" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
