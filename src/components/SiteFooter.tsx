import Link from "next/link";
import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-ink-950/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm leading-relaxed text-slate-500">
            NAVA rents disposable virtual numbers across 16 countries so you can receive
            one-time passcodes in seconds — pay only when the code lands.
          </p>
          <div className="flex gap-2 text-lg">🇳🇬 🇺🇸 🇬🇧 🇬🇭 🇰🇪 🇮🇳 🇵🇭 🇩🇪</div>
        </div>

        <FooterCol
          title="Popular services"
          links={[
            ["Match OTP", "/pricing?service=match"],
            ["Zoosk OTP", "/pricing?service=zoosk"],
            ["Gmail OTP", "/pricing?service=gmail"],
            ["PayPal OTP", "/pricing?service=paypal"],
            ["Venmo OTP", "/pricing?service=venmo"],
          ]}
        />
        <FooterCol
          title="Countries"
          links={[
            ["Nigeria numbers", "/pricing?country=NG"],
            ["USA numbers", "/pricing?country=US"],
            ["UK numbers", "/pricing?country=GB"],
            ["Ghana numbers", "/pricing?country=GH"],
            ["Kenya numbers", "/pricing?country=KE"],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ["Pricing", "/pricing"],
            ["How it works", "/#how"],
            ["FAQ", "/#faq"],
            ["Create account", "/register"],
            ["Sign in", "/login"],
          ]}
        />
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} NAVA. All rights reserved.</p>
          <p>
            Demo environment — numbers and SMS traffic are simulated for product demonstration
            purposes.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h4 className="mb-4 text-sm font-bold text-white">{title}</h4>
      <ul className="space-y-2.5">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm text-slate-500 transition hover:text-emerald-300">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
