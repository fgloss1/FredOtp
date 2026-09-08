import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-14">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card p-7">
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sign in to rent numbers and read your inbound OTPs.
          </p>
          <div className="mt-6">
            <AuthForm mode="login" next={next} />
          </div>
        </div>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-center text-xs text-slate-400">
            Development demo account is available only when demo data is explicitly enabled.
          </p>
        )}
      </div>
    </main>
  );
}
