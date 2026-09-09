"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

const INPUT =
  "w-full rounded-xl border border-white/12 bg-ink-950/70 px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-400/60";

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "register" ? { username, name, email, password } : { username, password }),
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }

    router.replace(next && next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {mode === "register" && (
        <Field label="Full name">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Fred Okonkwo"
            className={INPUT}
          />
        </Field>
      )}

      <Field label="Username">
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          minLength={3}
          maxLength={32}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourusername"
          className={INPUT}
        />
      </Field>
      {mode === "register" && (
        <Field label="Email address">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@email.com"
            className={INPUT}
          />
        </Field>
      )}

      <Field label="Password">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          placeholder="At least 8 characters"
          className={INPUT}
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="glow-btn w-full rounded-xl bg-gradient-to-r from-mint-500 to-brand-500 py-3.5 text-sm font-extrabold text-ink-950 transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        {mode === "login" ? (
          <>
            New to NAVA?{" "}
            <Link href="/register" className="font-semibold text-emerald-300 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-emerald-300 hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>

    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

