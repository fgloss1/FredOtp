import { WalletTopUp } from "@/components/dashboard/WalletTopUp";
import { requireUser } from "@/lib/auth";
import { shortDate, usd } from "@/lib/format";
import { getUserTransactions } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TYPE_TONE: Record<string, string> = {
  topup: "bg-brand-400/10 text-brand-300 ring-brand-400/25",
  bonus: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
  purchase: "bg-slate-400/10 text-slate-300 ring-slate-400/25",
  refund: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
};

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const transactions = await getUserTransactions(user.id);
  const amount = Number(params.amount);

  const toppedUp = transactions
    .filter((item) => item.type === "topup" || item.type === "bonus")
    .reduce((sum, item) => sum + item.amountCents, 0);
  const spent = transactions
    .filter((item) => item.type === "purchase")
    .reduce((sum, item) => sum + Math.abs(item.amountCents), 0);
  const refunded = transactions
    .filter((item) => item.type === "refund")
    .reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Wallet</h1>
        <p className="text-sm text-slate-500">
          Fund once, then spend code by code. Refunds land back here instantly.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Total funded" value={usd(toppedUp)} />
        <Summary label="Spent on codes" value={usd(spent)} />
        <Summary label="Refunded" value={usd(refunded)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <WalletTopUp
          balanceCents={user.balanceCents}
          defaultAmount={Number.isFinite(amount) ? amount : undefined}
        />

        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-black text-white">Transaction history</h2>
          <p className="text-sm text-slate-500">Last {transactions.length} entries</p>

          <div className="scrollbar-thin mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {transactions.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">No transactions yet.</p>
            )}
            {transactions.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{item.description}</p>
                  <p className="text-[11px] text-slate-500">
                    {shortDate(item.createdAt)} · {item.reference}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                      TYPE_TONE[item.type] ?? TYPE_TONE.purchase
                    }`}
                  >
                    {item.type}
                  </span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      item.amountCents < 0 ? "text-slate-400" : "text-emerald-300"
                    }`}
                  >
                    {item.amountCents < 0 ? "-" : "+"}
                    {usd(Math.abs(item.amountCents))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
