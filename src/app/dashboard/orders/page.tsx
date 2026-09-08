import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { shortDate, usd } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/otp";
import { getUserRentals } from "@/lib/queries";
import { syncActiveRentals } from "@/lib/rental-engine";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  await syncActiveRentals(user.id);
  const rentals = await getUserRentals(user.id, 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">My rentals</h1>
          <p className="text-sm text-slate-500">
            Every number you have rented, with the SMS payload we captured.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 px-4 py-2.5 text-sm font-bold text-ink-950"
        >
          Rent another number
        </Link>
      </div>

      {rentals.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-3 font-semibold text-white">No rentals yet</p>
          <p className="mt-1 text-sm text-slate-500">Your rental history will appear here.</p>
        </div>
      ) : (
        <div className="card scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-bold">Service</th>
                <th className="px-4 py-3 font-bold">Number</th>
                <th className="px-4 py-3 font-bold">Code</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Price</th>
                <th className="px-4 py-3 font-bold">Date</th>
              </tr>
            </thead>
            <tbody>
              {rentals.map((rental) => (
                <tr key={rental.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="mr-2">{rental.serviceIcon}</span>
                    <span className="font-semibold text-white">{rental.serviceName}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {rental.countryFlag} {rental.countryName}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-mono text-slate-300">
                    {rental.phoneNumber}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    {rental.otpCode ? (
                      <span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 font-mono font-bold tracking-widest text-emerald-300">
                        {rental.otpCode}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusTone(rental.status)}`}>
                      {statusLabel(rental.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-300">
                    {usd(rental.priceCents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                    {shortDate(rental.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
