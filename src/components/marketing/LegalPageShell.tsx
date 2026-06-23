import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Download as DownloadIcon } from "lucide-react";
import cofexLogo from "@/assets/cofex-logo.png";

const legalFont = { fontFamily: "'Nunito Sans', system-ui, sans-serif" } as const;

interface LegalLink {
  to: string;
  label: string;
}

interface LegalLinkGroup {
  title: string;
  links: LegalLink[];
}

export const LEGAL_LINK_GROUPS: LegalLinkGroup[] = [
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms & Conditions" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/impressum", label: "Impressum" },
      { to: "/cookies", label: "Cookie Policy" },
      { to: "/accessibility", label: "Accessibility Statement" },
    ],
  },
  {
    title: "Policies",
    links: [
      { to: "/community", label: "Community Guidelines" },
      { to: "/rewards", label: "Rewards & Campaign Rules" },
      { to: "/partners", label: "Partner Terms" },
      { to: "/data-processing", label: "Data Processing" },
      { to: "/social-media", label: "Publishing on Social Media" },
    ],
  },
];

export function MarketingNav({ trailing }: { trailing?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[color:var(--border)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link to="/" className="flex items-center gap-3 font-medium leading-tight">
          <img src={cofexLogo} alt="CO:FE(X) logo" width={40} height={40} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" />
          <span className="flex flex-col leading-tight">
            <span className="text-[10px] sm:text-sm md:text-base tracking-[0.12em] sm:tracking-[0.2em] md:tracking-[0.3em]">
              CO:FE(X) // Coffee Explorer Network
            </span>
            <span className="text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.2em] opacity-70 mt-0.5">
              Explore. Share. Earn.
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {trailing ?? (
            <>
              <a href="/#about" className="hidden sm:inline hover:opacity-70">
                About
              </a>
              <a href="/#reviews" className="hidden sm:inline hover:opacity-70">
                Reviews
              </a>
              <Link to="/auth" className="hidden sm:inline hover:opacity-70">
                Sign in
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--cofex-black)] px-4 py-2 text-sm hover:bg-[color:var(--cofex-black)] hover:text-white transition"
              >
                Get started <DownloadIcon className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-[color:var(--cofex-black)] text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 leading-tight hover:opacity-90 transition">
            <img src={cofexLogo} alt="CO:FE(X) logo" width={48} height={48} className="h-12 w-12 shrink-0" />
            <span className="flex flex-col">
              <span className="font-bold tracking-[0.15em] sm:tracking-[0.2em] text-sm sm:text-base">CO:FE(X)</span>
              <span className="text-xs tracking-[0.12em] opacity-70 mt-1">Coffee Explorer Network</span>
              <span className="text-xs tracking-[0.12em] opacity-70 mt-0.5">Explore. Share. Earn.</span>
            </span>
          </Link>
        </div>
        <div>
          <a href="mailto:Contact@COFE-X.com" className="hover:opacity-80">
            Contact@COFE-X.com
          </a>
          <p className="font-bold mt-4">Contact Us</p>
          <p className="mt-2 opacity-80">
            Maria-Sybilla-Merian-Str. 12
            <br />
            80999 München, Germany
          </p>
        </div>
        <div>
          <p className="font-bold">Follow Us</p>
          <p className="mt-2 underline opacity-80">Instagram</p>
          <p className="underline opacity-80">X.com</p>
        </div>
        <div>
          <p className="font-bold">Legal</p>
          <div className="mt-2 space-y-1">
            {LEGAL_LINK_GROUPS[0].links.map((link) => (
              <Link key={link.to} to={link.to} className="block hover:opacity-80">
                {link.label}
              </Link>
            ))}
          </div>
          <p className="font-bold mt-4">Policies</p>
          <div className="mt-2 space-y-1">
            {LEGAL_LINK_GROUPS[1].links.map((link) => (
              <Link key={link.to} to={link.to} className="block hover:opacity-80">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 pb-6 text-xs opacity-70">© {new Date().getFullYear()} by CO:FE(X)</div>
    </footer>
  );
}

interface LegalPageShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageShell({ title, subtitle, lastUpdated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-white text-[color:var(--cofex-black)] flex flex-col" style={legalFont}>
      <MarketingNav />
      <main className="flex-1">
        <div
          className="border-b border-[color:var(--border)]"
          style={{ background: "linear-gradient(180deg, var(--cofex-pastel-blue) 0%, #fff 100%)" }}
        >
          <div className="mx-auto max-w-3xl px-5 py-14 sm:py-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--cofex-cyan)" }}>
              Legal
            </p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-4 text-base sm:text-lg opacity-75 max-w-xl mx-auto">{subtitle}</p>
            <p className="mt-6 text-sm opacity-60">Last updated: {lastUpdated}</p>
          </div>
        </div>
        <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16 legal-prose">{children}</article>
      </main>
      <MarketingFooter />
    </div>
  );
}

interface LegalSectionProps {
  id?: string;
  title: string;
  children: ReactNode;
}

export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl sm:text-2xl font-extrabold mb-4">{title}</h2>
      <div className="space-y-4 text-sm sm:text-base leading-relaxed text-[color:var(--cofex-black)]/85">{children}</div>
    </section>
  );
}

export function LegalCallout({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl border px-5 py-4 text-sm leading-relaxed"
      style={{ borderColor: "var(--border)", background: "var(--cofex-pastel-gray)" }}
    >
      {children}
    </div>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
