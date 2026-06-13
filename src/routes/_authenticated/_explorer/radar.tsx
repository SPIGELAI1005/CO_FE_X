import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RADAR_CENTER,
  useCoffeeRadar,
  type RadarCampaign,
  type RadarShop,
  type RadarStats,
} from "@/lib/queries/radar";
import {
  Coffee, Flame, Megaphone, Trophy, MapPin, Sparkles, Locate,
  Gift, Leaf, ArrowRight, RadioTower, Zap, Target, Crown,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/radar")({
  head: () => ({
    meta: [
      { title: "Coffee Radar™ — CO:FE(X)" },
      { name: "description", content: "Today's free coffee, trending matcha, new campaigns and your explorer challenges — all in one daily pulse." },
    ],
  }),
  component: RadarPage,
});

type Shop = RadarShop;
type Campaign = RadarCampaign;
type Stats = RadarStats;
type Radar = NonNullable<ReturnType<typeof useCoffeeRadar>["data"]>;

function RadarPage() {
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(new Date());
  const radarQuery = useCoffeeRadar(center);
  const data = radarQuery.data ?? null;
  const loading = radarQuery.isLoading;

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCenter([pos.coords.latitude, pos.coords.longitude]); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 11) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, [now]);

  const challenges = useMemo(() => buildChallenges(data?.stats), [data?.stats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0f08] via-[#2a1610] to-[#3a1a0f] pb-20 text-amber-50">
      {/* Atmospheric glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-60">
        <div className="absolute -top-40 -left-20 h-[420px] w-[420px] rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[380px] w-[380px] rounded-full bg-rose-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pt-6">
        {/* Hero */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-100/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/90 backdrop-blur">
              <RadioTower className="h-3 w-3 animate-pulse" /> Coffee Radar™ · Live
            </div>
            <h1 className="mt-3 text-4xl md:text-5xl font-extrabold leading-[1.05] text-amber-50">
              {greeting}.<br/>
              <span className="bg-gradient-to-r from-amber-200 via-rose-200 to-orange-300 bg-clip-text text-transparent">
                Here's your coffee pulse.
              </span>
            </h1>
            <p className="mt-2 text-sm text-amber-100/70 max-w-md">
              Scanned {data?.free_today.length ?? 0} free-coffee spots, {data?.trending_matcha.length ?? 0} trending matcha bars, {data?.new_campaigns.length ?? 0} fresh campaigns within 5 km.
            </p>
          </div>

          <RadarSweep />
        </div>

        {/* Stat strip */}
        <div className="mt-6 grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
          <Stat icon={<Zap className="h-4 w-4" />} label="Streak" value={`${data?.stats.streak_days ?? 0}d`} accent="from-amber-400 to-orange-500" />
          <Stat icon={<Coffee className="h-4 w-4" />} label="This week" value={data?.stats.visits_this_week ?? 0} accent="from-rose-400 to-pink-500" />
          <Stat icon={<MapPin className="h-4 w-4" />} label="Cities" value={data?.stats.cities_explored ?? 0} accent="from-emerald-400 to-teal-500" />
          <Stat icon={<Sparkles className="h-4 w-4" />} label="Points" value={data?.stats.total_points ?? 0} accent="from-violet-400 to-fuchsia-500" />
        </div>

        {/* Location chip */}
        <div className="mt-5 flex items-center justify-between text-xs text-amber-100/70">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Radius 5 km · {center ? "Your location" : "Lisbon (default)"}
          </span>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-100/10 px-3 py-1 font-semibold text-amber-100 hover:bg-amber-100/20 transition disabled:opacity-50"
          >
            <Locate className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Locating…" : center ? "Update" : "Use my location"}
          </button>
        </div>

        {/* Section 1 — Free coffee */}
        <Section
          icon={<Gift className="h-5 w-5" />}
          eyebrow="Today only"
          title={`${data?.free_today.length ?? 0} cafés nearby offering free coffee`}
          accent="amber"
          loading={loading}
          empty={!loading && (data?.free_today.length ?? 0) === 0 ? "No free-coffee spots in your radius right now. Widen your range or check back tomorrow." : null}
        >
          <HScroll>
            {data?.free_today.map((s) => (
              <FreeCard key={s.id} shop={s} />
            ))}
          </HScroll>
        </Section>

        {/* Section 2 — Trending matcha */}
        <Section
          icon={<Flame className="h-5 w-5" />}
          eyebrow="Heating up"
          title="Trending Matcha spots"
          accent="emerald"
          loading={loading}
          empty={!loading && (data?.trending_matcha.length ?? 0) === 0 ? "No matcha bars trending yet — be the first to check in." : null}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data?.trending_matcha.map((s, i) => (
              <TrendingCard key={s.id} shop={s} rank={i + 1} />
            ))}
          </div>
        </Section>

        {/* Section 3 — New campaigns */}
        <Section
          icon={<Megaphone className="h-5 w-5" />}
          eyebrow="Fresh drops"
          title="New EEFFOC campaigns"
          accent="rose"
          loading={loading}
          empty={!loading && (data?.new_campaigns.length ?? 0) === 0 ? "No new campaigns this week. Visit /campaigns to see active ones." : null}
        >
          <HScroll>
            {data?.new_campaigns.map((c) => (
              <CampaignCard key={c.id} c={c} now={now} />
            ))}
          </HScroll>
        </Section>

        {/* Section 4 — Challenges */}
        <Section
          icon={<Trophy className="h-5 w-5" />}
          eyebrow="Earn this week"
          title="Explorer Challenges"
          accent="violet"
          loading={loading}
          empty={null}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {challenges.map((ch) => (
              <ChallengeCard key={ch.id} ch={ch} />
            ))}
          </div>
        </Section>

        <p className="mt-10 mb-6 text-center text-[11px] text-amber-100/40">
          Updated {data ? new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} · Coffee Radar™
        </p>
      </div>
    </div>
  );
}

/* ---------- Pieces ---------- */

function RadarSweep() {
  return (
    <div className="relative h-28 w-28 shrink-0">
      <div className="absolute inset-0 rounded-full border border-amber-300/30" />
      <div className="absolute inset-3 rounded-full border border-amber-300/20" />
      <div className="absolute inset-6 rounded-full border border-amber-300/10" />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, rgba(251,191,36,0) 0deg, rgba(251,191,36,0.5) 60deg, rgba(251,191,36,0) 90deg)",
          animation: "radar-spin 3.5s linear infinite",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Coffee className="h-6 w-6 text-amber-200" />
      </div>
      <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
      <style>{`@keyframes radar-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-black/30 px-3 py-2">
      <div className={`absolute -right-4 -top-4 h-12 w-12 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-xl`} />
      <div className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-100/60">
        {icon} {label}
      </div>
      <div className="relative mt-0.5 text-xl font-extrabold text-amber-50">{value}</div>
    </div>
  );
}

function Section({ icon, eyebrow, title, accent, loading, empty, children }: {
  icon: React.ReactNode; eyebrow: string; title: string;
  accent: "amber" | "emerald" | "rose" | "violet";
  loading: boolean; empty: string | null; children: React.ReactNode;
}) {
  const dot = { amber: "bg-amber-300", emerald: "bg-emerald-300", rose: "bg-rose-300", violet: "bg-violet-300" }[accent];
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-100/60">
            <span className={`h-1.5 w-1.5 rounded-full ${dot} shadow-[0_0_10px_currentColor]`} />
            {eyebrow}
          </div>
          <h2 className="mt-1 flex items-center gap-2 text-xl md:text-2xl font-bold text-amber-50">
            {icon} {title}
          </h2>
        </div>
      </div>
      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[0,1,2].map((i) => <div key={i} className="h-44 w-64 shrink-0 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-amber-100/60">{empty}</div>
      ) : children}
    </section>
  );
}

function HScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 pb-2">{children}</div>
    </div>
  );
}

function FreeCard({ shop }: { shop: Shop }) {
  return (
    <Link
      to="/coffee/$slug"
      params={{ slug: shop.slug }}
      className="group relative w-64 shrink-0 overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-900/40 to-black/40 backdrop-blur-xl transition hover:border-amber-300/60 hover:-translate-y-0.5"
    >
      <div className="relative h-32 overflow-hidden">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-amber-400/30 to-rose-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-950 shadow-lg">
          <Gift className="h-3 w-3" /> FREE TODAY
        </span>
        {shop.distance_km != null && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-amber-100 backdrop-blur">
            {shop.distance_km < 1 ? `${Math.round(shop.distance_km * 1000)} m` : `${shop.distance_km.toFixed(1)} km`}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-amber-50 truncate">{shop.name}</div>
        <div className="mt-0.5 text-[11px] text-amber-100/60 truncate">{shop.city ?? "Nearby"} · ★ {Number(shop.rating).toFixed(1)}</div>
      </div>
    </Link>
  );
}

function TrendingCard({ shop, rank }: { shop: Shop; rank: number }) {
  return (
    <Link
      to="/coffee/$slug"
      params={{ slug: shop.slug }}
      className="group flex gap-3 overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-r from-emerald-900/30 to-black/40 p-2 backdrop-blur-xl transition hover:border-emerald-300/50"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-emerald-500/40 to-teal-700/40 flex items-center justify-center">
            <Leaf className="h-6 w-6 text-emerald-200" />
          </div>
        )}
        <span className="absolute top-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-200">#{rank}</span>
      </div>
      <div className="flex-1 min-w-0 py-1 pr-2">
        <div className="font-bold text-amber-50 truncate">{shop.name}</div>
        <div className="text-[11px] text-amber-100/60 truncate">{shop.city ?? "—"}</div>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
          <Flame className="h-3 w-3" /> {shop.recent_visits ?? 0} check-ins · 14d
        </div>
      </div>
    </Link>
  );
}

function CampaignCard({ c, now }: { c: Campaign; now: Date }) {
  const endsIn = c.ends_at ? Math.max(0, Math.ceil((new Date(c.ends_at).getTime() - now.getTime()) / 86_400_000)) : null;
  return (
    <Link
      to="/campaign/$id"
      params={{ id: c.id }}
      className="group relative w-72 shrink-0 overflow-hidden rounded-2xl border border-rose-300/20 bg-gradient-to-br from-rose-900/40 to-black/50 backdrop-blur-xl transition hover:border-rose-300/60 hover:-translate-y-0.5"
    >
      <div className="relative h-36 overflow-hidden">
        {c.cover_image_url ? (
          <img src={c.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-rose-500/40 via-orange-500/30 to-amber-400/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-rose-300 px-2 py-0.5 text-[10px] font-extrabold text-rose-950">
          <Sparkles className="h-3 w-3" /> +{c.points_reward} pts
        </span>
        {endsIn != null && endsIn <= 7 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
            {endsIn === 0 ? "Ends today" : `${endsIn}d left`}
          </span>
        )}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="text-[10px] uppercase tracking-widest text-rose-200/80">{c.shop_name} · {c.shop_city ?? ""}</div>
          <div className="text-base font-bold text-amber-50 line-clamp-2">{c.title}</div>
        </div>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-amber-100/70">
        <span className="truncate">{c.reward_description ?? "Tap to view"}</span>
        <span className="inline-flex items-center gap-1 font-semibold text-rose-200">{c.participants} joined <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
  );
}

/* ---------- Challenges (computed from stats) ---------- */

type Challenge = { id: string; icon: React.ReactNode; title: string; subtitle: string; progress: number; target: number; reward: number; accent: string; href?: string };

function buildChallenges(s?: Stats): Challenge[] {
  const stats: Stats = s ?? { total_check_ins: 0, total_points: 0, visits_this_week: 0, new_shops_this_week: 0, unique_shops: 0, cities_explored: 0, active_campaigns: 0, streak_days: 0 };
  return [
    { id: "weekly", icon: <Target className="h-4 w-4" />, title: "Weekly Wanderer",
      subtitle: "Check in 5 times this week", progress: stats.visits_this_week, target: 5, reward: 50,
      accent: "from-violet-500 to-fuchsia-600" },
    { id: "new3", icon: <Sparkles className="h-4 w-4" />, title: "Three New Doors",
      subtitle: "Visit 3 cafés you've never been to this week", progress: stats.new_shops_this_week, target: 3, reward: 75,
      accent: "from-amber-500 to-orange-600" },
    { id: "streak", icon: <Zap className="h-4 w-4" />, title: "On Fire",
      subtitle: "Hit a 5-day check-in streak", progress: stats.streak_days, target: 5, reward: 100,
      accent: "from-rose-500 to-red-600" },
    { id: "cities", icon: <Crown className="h-4 w-4" />, title: "City Hopper",
      subtitle: "Explore 3 different cities", progress: stats.cities_explored, target: 3, reward: 150,
      accent: "from-emerald-500 to-teal-600" },
  ];
}

function ChallengeCard({ ch }: { ch: Challenge }) {
  const pct = Math.min(100, Math.round((ch.progress / ch.target) * 100));
  const done = ch.progress >= ch.target;
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${done ? "border-emerald-300/40" : "border-white/10"} bg-white/5 p-4 backdrop-blur-xl`}>
      <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${ch.accent} opacity-30 blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-100/60">
            {ch.icon} Challenge
          </div>
          <div className="mt-1 font-bold text-amber-50">{ch.title}</div>
          <div className="text-[12px] text-amber-100/70">{ch.subtitle}</div>
        </div>
        <div className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${done ? "bg-emerald-300 text-emerald-950" : "bg-amber-300/90 text-amber-950"}`}>
          +{ch.reward} pts
        </div>
      </div>
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[11px] text-amber-100/70">
          <span>{ch.progress} / {ch.target}</span>
          <span>{done ? "Complete!" : `${pct}%`}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r ${ch.accent} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
