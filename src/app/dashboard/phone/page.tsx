import NavaPhone from "@/components/voice/NavaPhone";
import NavaSmsInbox from "@/components/voice/NavaSmsInbox";

export default function PhonePage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300/70">
            Communication
          </p>
          <h1 className="text-xl font-black tracking-tight text-white">
            Phone
          </h1>
                  </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Personal line
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,460px)_minmax(360px,400px)] lg:items-start">
        <div className="min-w-0">
          <NavaPhone />
        </div>

        <div className="min-w-0 xl:sticky xl:top-24">
          <NavaSmsInbox />
        </div>
      </div>
    </div>
  );
}