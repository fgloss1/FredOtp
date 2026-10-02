"use client";

import React, { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
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

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const resetUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("A password reset link has been sent to your email. Check your inbox or spam folder.");
    } catch (err: any) {
      setErrorMessage("Unable to send reset link. Please try again.");
    } finally {
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
        success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
      }
    : {
        pageBg: "bg-slate-100",
        cardBg: "bg-white border-slate-200 shadow-2xl",
        text: "text-slate-900",
        muted: "text-slate-600 font-semibold",
        input: "bg-slate-100 border-slate-300 text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-emerald-500",
        error: "bg-red-50 border-red-200 text-red-600 font-semibold",
        success: "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold",
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
          <h1 className={`text-xl font-bold ${theme.text} pt-2`}>Forgot Password?</h1>
          <p className={`text-xs ${theme.muted}`}>
            Enter your email and we will send you a link to reset your password.
          </p>
        </div>

        {message && (
          <div className={`p-4 border rounded-xl text-xs font-semibold text-center leading-relaxed ${theme.success}`}>
            {message}
          </div>
        )}

        {errorMessage && (
          <div className={`p-3 border rounded-xl text-xs font-semibold text-center ${theme.error}`}>
            {errorMessage}
          </div>
        )}

        {!message && (
          <form onSubmit={handleResetRequest} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <div className={`text-center pt-2 border-t ${darkMode ? "border-slate-800" : "border-slate-200"} text-xs ${theme.muted}`}>
          Remembered your password?{" "}
          <Link href="/login" className="text-emerald-500 font-extrabold hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}