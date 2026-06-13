import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Award,
  Coffee,
  MapPin,
  Globe2,
  Trophy,
  Sparkles,
  Lock,
  Stamp as StampIcon,
  Flame,
  Leaf,
  Crown,
  Compass,
} from "lucide-react";
import { EmptyState } from "@/components/patterns/EmptyState";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useUser } from "@/hooks/use-user";
import { usePassport, type PassportBadge, type PassportCheckIn } from "@/lib/queries/passport";
export const Route = createFileRoute("/_authenticated/_explorer/passport")({
  head: () => ({ meta: [{ title: "Passport — CO:FE(X)" }] }),
  component: PassportPage,
});

type Badge = PassportBadge;
type CheckIn = PassportCheckIn;

const BADGE_ICONS: Record<string, { Icon: any; from: string; to: string }> = {
  "first-sip": { Icon: Coffee, from: "from-amber-400", to: "to-orange-600" },
  "coffee-curious": { Icon: Sparkles, from: "from-pink-400", to: "to-rose-600" },
  "cafe-connoisseur": { Icon: Crown, from: "from-yellow-300", to: "to-amber-600" },
  "espresso-explorer": { Icon: Flame, from: "from-orange-500", to: "to-red-700" },
  "cappuccino-collector": { Icon: Coffee, from: "from-amber-200", to: "to-amber-700" },
  "matcha-hunter": { Icon: Leaf, from: "from-emerald-400", to: "to-green-700" },
  "coffee-nomad": { Icon: Compass, from: "from-sky-400", to: "to-indigo-700" },
  "munich-explorer": { Icon: MapPin, from: "from-blue-400", to: "to-blue-800" },
  "berlin-explorer": { Icon: MapPin, from: "from-zinc-400", to: "to-zinc-800" },
  "european-coffee-legend": { Icon: Globe2, from: "from-violet-400", to: "to-purple-800" },
};

function progressFor(b: Badge, stats: {
  totalCheckIns: number;
  uniqueShops: number;
  tagCounts: Record<string, number>;
  cityCounts: Record<string, number>;
  countriesVisited: Set<string>;
}) {
  const c = b.criteria || {};
  const threshold = Number(c.threshold ?? 1);
  let current = 0;
  switch (c.type) {
    case "check_ins": current = stats.totalCheckIns; break;
    case "unique_shops": current = stats.uniqueShops; break;
    case "tag": current = stats.tagCounts[String(c.value).toLowerCase()] ?? 0; break;
    case "city": current = stats.cityCounts[String(c.value).toLowerCase()] ?? 0; break;
    case "region_countries": {
      const set = new Set((c.countries ?? []).map((s: string) => s.toLowerCase()));
      current = Array.from(stats.countriesVisited).filter((c2) => set.has(c2)).length;
      break;
    }
  }
  return { current: Math.min(current, threshold), threshold, pct: Math.min(100, Math.round((current / threshold) * 100)) };
}

function PassportPage() {
  const { user } = useUser();
  const passportQuery = usePassport(user?.id);

  return (
    <QueryBoundary query={passportQuery} loadingLabel="Loading passport…">
      {(data) => <PassportContent data={data} />}
    </QueryBoundary>
  );
}

function PassportContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof usePassport>["data"]>;
}) {
  const { profile, badges, earnedBadgeIds: earned, checkIns } = data;

  const stats = useMemo(() => {    const tagCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const countriesVisited = new Set<string>();
    const uniqueShopIds = new Set<string>();
    const uniqueShopByCity = new Map<string, Set<string>>();
    for (const ci of checkIns) {
      const s = ci.coffee_shops;
      if (!s) continue;
      uniqueShopIds.add(s.id);
      for (const t of s.tags ?? []) tagCounts[t.toLowerCase()] = (tagCounts[t.toLowerCase()] ?? 0) + 1;
      if (s.city) {
        const k = s.city.toLowerCase();
        if (!uniqueShopByCity.has(k)) uniqueShopByCity.set(k, new Set());
        uniqueShopByCity.get(k)!.add(s.id);
      }
      if (s.country) countriesVisited.add(s.country.toLowerCase());
    }
    for (const [k, v] of uniqueShopByCity) cityCounts[k] = v.size;
    return {
      totalCheckIns: checkIns.length,
      uniqueShops: uniqueShopIds.size,
      tagCounts,
      cityCounts,
      countriesVisited,
    };
  }, [checkIns]);

  const cityGroups = useMemo(() => {
    const m = new Map<string, { city: string; country: string | null; stamps: CheckIn[] }>();
    for (const ci of checkIns) {
      const s = ci.coffee_shops; if (!s?.city) continue;
      const key = `${s.city}__${s.country ?? ""}`;
      if (!m.has(key)) m.set(key, { city: s.city, country: s.country, stamps: [] });
      m.get(key)!.stamps.push(ci);
    }
    return Array.from(m.values()).sort((a, b) => b.stamps.length - a.stamps.length);
  }, [checkIns]);

  const countryGroups = useMemo(() => {
    const m = new Map<string, number>();
    for (const ci of checkIns) {
      const c = ci.coffee_shops?.country; if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [checkIns]);

  const earnedBadges = badges.filter((b) => earned.has(b.id));

  return (    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      {/* Hero passport card */}
      <div className="p-4 md:p-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 text-amber-50 shadow-2xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,#fde68a,transparent_45%)]" />
          <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full border-[14px] border-amber-300/20" />
          <div className="absolute -bottom-16 -left-10 h-64 w-64 rounded-full border-[12px] border-amber-200/10" />
          <div className="relative p-6 md:p-10 flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-200/80">
                <StampIcon className="h-3.5 w-3.5" /> Coffee Passport
              </div>
              <h1 className="mt-3 text-4xl md:text-5xl font-serif font-bold">
                {profile?.display_name ?? "Explorer"}
              </h1>
              <p className="mt-2 text-amber-100/80 max-w-md">
                Every visit is a stamp. Every stamp tells a story. Travel, sip, collect.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Stat label="Stamps" value={stats.totalCheckIns} />
                <Stat label="Unique cafés" value={stats.uniqueShops} />
                <Stat label="Cities" value={cityGroups.length} />
                <Stat label="Countries" value={countryGroups.length} />
                <Stat label="Points" value={profile?.total_points ?? 0} accent />
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center">
              <div className="h-24 w-24 rounded-full bg-amber-100 text-amber-900 grid place-items-center text-3xl font-bold shadow-inner border-4 border-amber-200/40">
                {earnedBadges.length}
              </div>
              <div className="mt-2 text-xs uppercase tracking-widest text-amber-200/80">Badges earned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges */}
      <section className="px-4 md:px-8 mt-2">
        <SectionHeader icon={<Award className="h-5 w-5" />} title="Achievements" subtitle="Collect them all" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges
            .sort((a, b) => Number(earned.has(b.id)) - Number(earned.has(a.id)))
            .map((b) => {
            const isEarned = earned.has(b.id);
            const p = progressFor(b, stats);
            const meta = BADGE_ICONS[b.slug] ?? { Icon: Award, from: "from-amber-400", to: "to-orange-600" };
            const Icon = meta.Icon;
            return (
              <div
                key={b.id}
                className={`group relative overflow-hidden rounded-2xl p-5 border transition-all hover:-translate-y-0.5 ${
                  isEarned
                    ? "bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-900/40 shadow-md shadow-amber-200/40 dark:shadow-black/40"
                    : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {isEarned && (
                  <div className="absolute top-3 right-3 text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    Earned
                  </div>
                )}
                <div
                  className={`relative h-16 w-16 rounded-2xl bg-gradient-to-br ${meta.from} ${meta.to} grid place-items-center shadow-lg ${
                    isEarned ? "" : "grayscale opacity-50"
                  }`}
                >
                  <Icon className="h-8 w-8 text-white drop-shadow" />
                  {!isEarned && (
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-zinc-800 text-white grid place-items-center">
                      <Lock className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <h3 className={`mt-4 font-semibold ${isEarned ? "text-zinc-900 dark:text-amber-50" : "text-zinc-700 dark:text-zinc-300"}`}>
                  {b.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">{b.description}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span>{p.current} / {p.threshold}</span>
                    <span>{p.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${meta.from} ${meta.to}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* City collections */}
      <section className="px-4 md:px-8 mt-10">
        <SectionHeader icon={<MapPin className="h-5 w-5" />} title="City collections" subtitle="Stamps grouped by city" />
        {cityGroups.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No city stamps yet"
            description="Check in at cafés to start collecting stamps."
            actionLabel="Explore cafés"
            actionTo="/explore"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cityGroups.map((g) => (
              <div key={`${g.city}-${g.country}`} className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{g.city}</h3>
                    <p className="text-xs text-zinc-500">{g.country}</p>
                  </div>
                  <div className="text-2xl font-serif font-bold text-amber-600">{g.stamps.length}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.stamps.slice(0, 12).map((ci) => (
                    <Link
                      key={ci.id}
                      to="/coffee/$slug"
                      params={{ slug: ci.coffee_shops!.slug }}
                      title={ci.coffee_shops!.name}
                      className="relative h-12 w-12 rounded-full border-2 border-dashed border-amber-400/70 grid place-items-center overflow-hidden bg-amber-50 dark:bg-zinc-800 hover:scale-105 transition"
                    >
                      {ci.coffee_shops?.logo_url || ci.coffee_shops?.cover_image_url ? (
                        <img
                          src={ci.coffee_shops.logo_url ?? ci.coffee_shops.cover_image_url ?? ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Coffee className="h-5 w-5 text-amber-700" />
                      )}
                    </Link>
                  ))}
                  {g.stamps.length > 12 && (
                    <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 grid place-items-center text-xs text-zinc-600 dark:text-zinc-300">
                      +{g.stamps.length - 12}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Country collections */}
      <section className="px-4 md:px-8 mt-10 pb-24">
        <SectionHeader icon={<Globe2 className="h-5 w-5" />} title="Country collections" subtitle="The world, one cup at a time" />
        {countryGroups.length === 0 ? (
          <EmptyState
            icon={Globe2}
            title="No country stamps yet"
            description="Visit cafés in new countries to fill your passport."
            actionLabel="Explore cafés"
            actionTo="/explore"
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {countryGroups.map(([country, count]) => (
              <div
                key={country}
                className="flex items-center gap-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-2 pr-4 py-2"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-700 grid place-items-center text-white">
                  <Trophy className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-tight">{country}</div>
                  <div className="text-xs text-zinc-500">{count} stamp{count === 1 ? "" : "s"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl px-4 py-2 ${accent ? "bg-amber-300 text-amber-950" : "bg-white/10 text-amber-50 backdrop-blur"}`}>
      <div className="text-2xl font-bold leading-none font-serif">{value}</div>
      <div className="text-[10px] uppercase tracking-widest mt-1 opacity-80">{label}</div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          {icon}
          <h2 className="text-xl font-serif font-bold">{title}</h2>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}
