import NavaPhone from "@/components/voice/NavaPhone";
import NavaSmsInbox from "@/components/voice/NavaSmsInbox";

export default function PhonePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">NAVA Phone Test</h1>
        <p className="text-sm text-slate-500">
          Local WebRTC connection test.
        </p>
      </div>

      <div className="card p-6">
        <NavaPhone />
      </div>

      <NavaSmsInbox />
    </div>
  );
}
