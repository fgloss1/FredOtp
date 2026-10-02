"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface WelcomeModalProps {
  isOpen: boolean;
  type: "welcome" | "welcome-back";
  userName: string;
  onClose?: () => void;
}

export default function WelcomeModal({ isOpen, type, userName, onClose }: WelcomeModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isNew = type === "welcome";
  const emoji = isNew ? "🎉" : "👋";
  const title = isNew ? `Welcome to NAVA, ${userName}!` : `Welcome back, ${userName}!`;
  const subtitle = isNew
    ? "Your account is ready. Start renting numbers and receiving OTPs instantly."
    : "Good to see you again. Your console is ready.";
  const button = isNew ? "Go to Dashboard →" : "Continue to Console →";

  const handleContinue = () => {
    if (onClose) onClose();
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={handleContinue}
    >
      <div
        className="w-full max-w-md mx-4 bg-gradient-to-br from-emerald-950/60 to-[#0b1120] border-2 border-emerald-500/40 rounded-3xl p-8 shadow-2xl shadow-emerald-500/20 animate-slideUp text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-5xl animate-bounce">
          {emoji}
        </div>

        <h2 className="text-2xl font-black text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-400 mb-8 leading-relaxed">{subtitle}</p>

        {isNew && (
          <div className="grid grid-cols-3 gap-2 mb-8 text-center">
            <div className="bg-black/40 border border-slate-800 rounded-xl p-3">
              <p className="text-lg">💰</p>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">Wallet</p>
            </div>
            <div className="bg-black/40 border border-slate-800 rounded-xl p-3">
              <p className="text-lg">🔑</p>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">20+ Services</p>
            </div>
            <div className="bg-black/40 border border-slate-800 rounded-xl p-3">
              <p className="text-lg">🌍</p>
              <p className="text-[10px] text-gray-400 mt-1 font-bold">16 Countries</p>
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30"
        >
          {button}
        </button>

        <p className="text-[10px] text-gray-500 mt-4">Click anywhere to continue</p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        .animate-slideUp { animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}