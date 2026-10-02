"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Force clean reload into dashboard
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setErrorMsg("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4">
      <div className="bg-[#0d1526] border border-slate-800 w-full max-w-md rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl text-black font-black text-2xl flex items-center justify-center mx-auto shadow-lg">
            N
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Welcome Back</h1>
          <p className="text-xs text-gray-400">Log in to manage your verification lines and wallet balance.</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#152035] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase">Password</label>
              <Link href="/forgot-password" className="text-[11px] font-bold text-emerald-400 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#152035] border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-3.5 rounded-xl transition-all shadow-lg text-xs"
          >
            {loading ? "Authenticating..." : "Log In to Dashboard"}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 pt-2 border-t border-slate-800/80">
          Don&apos;t have an account yet?{" "}
          <Link href="/signup" className="text-emerald-400 font-bold hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}