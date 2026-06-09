import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, MapPin, Trophy, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CO:FE(X) — Explore. Share. Earn." },
      {
        name: "description",
        content:
          "CO:FE(X) is the world's first Coffee Exploration Network. Discover independent coffee shops, collect badges, and earn free coffee.",
      },
      { property: "og:title", content: "CO:FE(X) — Coffee Explorer Network" },
      {
        property: "og:description",
        content: "Discover independent coffee shops. Collect badges. Earn rewards.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-semibold tracking-[0.2em] text-sm">
            CO<span style={{ color: "var(--gold)" }}>:</span>FE<span style={{ color: "var(--gold)" }}>(X)</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition"
            >
              Sign in
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              Get the app <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklab, var(--gold) 20%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-3xl px-5 pt-20 pb-16 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
            Now in early access
          </span>
          <h1 className="mt-6 text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05]">
            Explore. <span style={{ color: "var(--gold)" }}>Share.</span> Earn.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
            The world's first Coffee Exploration Network. Discover independent shops,
            collect badges as you check in, and unlock free coffee.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-base font-medium text-primary-foreground transition hover:translate-y-[-1px]"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
            >
              Start exploring <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-6 py-3 text-base text-foreground transition hover:bg-card"
            >
              For coffee shops
            </Link>
          </div>
        </div>

        {/* Hero card stack */}
        <div className="mx-auto max-w-md px-5 pb-24">
          <div className="relative h-[360px]">
            <Card
              className="absolute inset-x-6 top-8 rotate-[-4deg]"
              tint="oklch(0.3 0.05 45)"
              title="Bar Centrale"
              meta="Milano · 0.4 km"
              badge="+25 XP"
            />
            <Card
              className="absolute inset-x-3 top-16 rotate-[2deg]"
              tint="oklch(0.4 0.06 50)"
              title="Sant'Eustachio"
              meta="Roma · Checked in"
              badge="Badge unlocked"
            />
            <Card
              className="absolute inset-x-0 top-24"
              tint="var(--coffee)"
              title="Caffè del Borgo"
              meta="Bologna · 12 explorers here"
              badge="Free espresso"
              gold
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 py-20 grid gap-5 sm:grid-cols-3">
        <Feature
          icon={<MapPin className="h-5 w-5" />}
          title="Discover"
          body="Find independent coffee shops near you with a map made for explorers."
        />
        <Feature
          icon={<Coffee className="h-5 w-5" />}
          title="Check in"
          body="Earn XP every time you visit a new spot. Level up your taste."
        />
        <Feature
          icon={<Trophy className="h-5 w-5" />}
          title="Earn rewards"
          body="Collect badges and unlock free coffee at partner shops."
        />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <div
          className="rounded-3xl border border-border p-10 text-center"
          style={{ background: "var(--gradient-espresso)", boxShadow: "var(--shadow-elegant)" }}
        >
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Your next favorite coffee
            <br />
            is one check-in away.
          </h2>
          <Link
            to="/"
            className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-base font-medium text-primary-foreground transition hover:translate-y-[-1px]"
            style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}
          >
            Join CO:FE(X) <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-8 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} CO:FE(X)</span>
          <span className="tracking-[0.2em]">EXPLORE · SHARE · EARN</span>
        </div>
      </footer>
    </div>
  );
}

function Card({
  className = "",
  tint,
  title,
  meta,
  badge,
  gold = false,
}: {
  className?: string;
  tint: string;
  title: string;
  meta: string;
  badge: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border p-5 backdrop-blur-md ${className}`}
      style={{
        background: `linear-gradient(160deg, ${tint}, oklch(0.2 0.02 50))`,
        boxShadow: "var(--shadow-elegant)",
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--gold) 20%, transparent)" }}
        >
          <Coffee className="h-5 w-5" style={{ color: "var(--gold)" }} />
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
          style={
            gold
              ? { background: "var(--gradient-gold)", color: "var(--espresso)" }
              : { background: "oklch(1 0 0 / 8%)", color: "var(--cream)" }
          }
        >
          {badge}
        </span>
      </div>
      <h3 className="mt-6 text-lg font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{meta}</p>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl"
        style={{ background: "color-mix(in oklab, var(--gold) 18%, transparent)", color: "var(--gold)" }}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
