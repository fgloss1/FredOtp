"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [darkMode, setDarkMode] = useState(true);

  const applyTheme = (isDark: boolean) => {
    if (typeof document !== "undefined") {
      const bg = isDark ? "#070b14" : "#f1f5f9";
      document.documentElement.style.backgroundColor = bg;
      document.body.style.backgroundColor = bg;
    }
  };

  useLayoutEffect(() => {
    const saved = localStorage.getItem("nava-theme");
    const isDark = saved !== "light";
    setDarkMode(isDark);
    applyTheme(isDark);
  }, []);

  useEffect(() => {
    const onThemeChange = () => {
      const saved = localStorage.getItem("nava-theme");
      const isDark = saved !== "light";
      setDarkMode(isDark);
      applyTheme(isDark);
    };
    window.addEventListener("nava-theme-change", onThemeChange);
    return () => window.removeEventListener("nava-theme-change", onThemeChange);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage("Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const theme = darkMode
    ? {
        pageBg: "bg-[#070b14]",
        cardBg: "bg-[#0d1526] border-slate-800",
        text: "text-white",
        muted: "text-gray-400",
        input: "bg-[#152035] border-slate-700/80 text-white placeholder-gray-500",
        error: "bg-red-500/10 border-red-500/30 text-red-400",
      }
    : {
        pageBg: "bg-slate-100",
        cardBg: "bg-white border-slate-200 shadow-2xl",
        text: "text-slate-900",
        muted: "text-slate-600 font-semibold",
        input: "bg-slate-100 border-slate-300 text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-emerald-500",
        error: "bg-red-50 border-red-200 text-red-600 font-semibold",
      };

  return (
    <div className={`min-h-screen ${theme.pageBg} ${theme.text} flex items-center justify-center p-4 transition-colors duration-150`}>
      <div className={`w-full max-w-md ${theme.cardBg} border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6`}>
        
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-emerald-500 text-black font-black flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              N
            </span>
            <span className={`text-2xl font-black tracking-wider ${theme.text}`}>NAVA</span>
          </Link>
          <h1 className={`text-xl font-bold ${theme.text} pt-2`}>Register</h1>
          <p className={`text-xs ${theme.muted}`}>
            Get instant access to non-VoIP virtual numbers and eSIM lines.
          </p>
        </div>

        {errorMessage && (
          <div className={`p-3 border rounded-xl text-xs font-semibold text-center ${theme.error}`}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme.muted} block`}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition ${theme.input}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme.muted} block`}>
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition ${theme.input}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase tracking-wider ${theme.muted} block`}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full border rounded-xl px-4 py-3 text-xs outline-none transition ${theme.input}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className={`text-[10px] text-center leading-relaxed ${theme.muted}`}>
          By registering, you agree to NAVA Terms of Service and Privacy Guarantee.
        </p>

        <div className={`text-center pt-2 border-t ${darkMode ? "border-slate-800" : "border-slate-200"} text-xs ${theme.muted}`}>
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-500 font-extrabold hover:underline">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}