import NavaPhone from "@/components/voice/NavaPhone";
import NavaSmsInbox from "@/components/voice/NavaSmsInbox";

export default function PhonePage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300/70">
            Communication
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Phone
          </h1>
          <p className="mt-1 max-w-xl text-xs text-slate-400">
            Make browser calls and keep incoming verification messages visible
            in the same workspace.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Personal line
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)] lg:items-start">
        <div className="min-w-0">
          <NavaPhone />
        </div>

        <div className="min-w-0">
          <NavaSmsInbox />
        </div>
      </div>
    </div>
  );
}