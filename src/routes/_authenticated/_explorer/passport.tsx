import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useUser } from "@/hooks/use-user";
import { usePassport, type PassportBadge, type PassportCheckIn } from "@/lib/queries/passport";
import { useUserCityCollections, type UserCityCollection } from "@/lib/queries/city-collections";
import { useBeveragePassport } from "@/lib/queries/vision";
import { BEVERAGE_TAGS, beverageTitle } from "@/lib/beverage-tags";
import { cityToSlug } from "@/lib/cities";

export const Route = createFileRoute("/_authenticated/_explorer/passport")({
  head: () => ({ meta: [{ title: "Passport · CO:FE(X)" }] }),
  component: PassportPage,
});

type Badge = PassportBadge;
type CheckIn = PassportCheckIn;

const BADGE_ICONS: Record<string, { Icon: React.ComponentType<{ className?: string }>; from: string; to: string }> = {
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

function progressFor(
  b: Badge,
  stats: {
    totalCheckIns: number;
    uniqueShops: number;
    tagCounts: Record<string, number>;
    cityCounts: Record<string, number>;
    countriesVisited: Set<string>;
  },
) {
  const c = b.criteria || {};
  const threshold = Number(c.threshold ?? 1);
  let current = 0;
  switch (c.type) {
    case "check_ins":
      current = stats.totalCheckIns;
      break;
    case "unique_shops":
      current = stats.uniqueShops;
      break;
    case "tag":
      current = stats.tagCounts[String(c.value).toLowerCase()] ?? 0;
      break;
    case "city":
      current = stats.cityCounts[String(c.value).toLowerCase()] ?? 0;
      break;
    case "region_countries": {
      const set = new Set((c.countries ?? []).map((s: string) => s.toLowerCase()));
      current = Array.from(stats.countriesVisited).filter((c2) => set.has(c2)).length;
      break;
    }
  }
  return { current: Math.min(current, threshold), threshold, pct: Math.min(100, Math.round((current / threshold) * 100)) };
}

function PassportPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const passportQuery = usePassport(user?.id);
  const collectionsQuery = useUserCityCollections(user?.id);
  const beverageQuery = useBeveragePassport(user?.id);

  return (
    <QueryBoundary query={passportQuery} loadingLabel={t("passportPage.loading")}>
      {(data) => (
        <PassportContent
          data={data}
          collections={collectionsQuery.data ?? []}
          beverageCounts={beverageQuery.data ?? {}}
        />
      )}
    </QueryBoundary>
  );
}

function PassportContent({
  data,
  collections,
  beverageCounts,
}: {
  data: NonNullable<ReturnType<typeof usePassport>["data"]>;
  collections: UserCityCollection[];
  beverageCounts: Record<string, number>;
}) {
  const { t } = useTranslation();
  const { profile, badges, earnedBadgeIds: earned, earnedBadges, checkIns } = data;

  const stats = useMemo(() => {
    const tagCounts: Record<string, number> = {};
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
      const s = ci.coffee_shops;
      if (!s?.city) continue;
      const key = `${s.city}__${s.country ?? ""}`;
      if (!m.has(key)) m.set(key, { city: s.city, country: s.country, stamps: [] });
      m.get(key)!.stamps.push(ci);
    }
    return Array.from(m.values()).sort((a, b) => b.stamps.length - a.stamps.length);
  }, [checkIns]);

  const countryGroups = useMemo(() => {
    const m = new Map<string, number>();
    for (const ci of checkIns) {
      const c = ci.coffee_shops?.country;
      if (!c) continue;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [checkIns]);

  const earnedBadgeList = badges.filter((b) => earned.has(b.id));
  const recentBadges = earnedBadges
    .slice(0, 3)
    .map((eb) => badges.find((b) => b.id === eb.badge_id))
    .filter(Boolean) as Badge[];

  const collectionByCity = useMemo(() => {
    const m = new Map<string, UserCityCollection>();
    for (const c of collections) m.set(c.city_name.toLowerCase(), c);
    return m;
  }, [collections]);

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.passport.eyebrow")}
        title={profile?.display_name ?? t("pages.profile.titleFallback")}
        subtitle={t("pages.passport.subtitle")}
      />
      <AppPageBody className="space-y-2 pb-8">
        <div className="cofex-app-card relative overflow-hidden text-white" style={{ background: "var(--gradient-coffee)" }}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,var(--cofex-pastel-blue),transparent_45%)] opacity-20" />
          <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full border-[14px] border-white/15" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:p-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-amber-200/80">
                <StampIcon className="h-3.5 w-3.5" /> {t("passportPage.yourJourney")}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <HeroStat label={t("passportPage.stamps")} value={stats.totalCheckIns} />
                <HeroStat label={t("passportPage.uniqueCafes")} value={stats.uniqueShops} />
                <HeroStat label={t("passportPage.cities")} value={cityGroups.length} />
                <HeroStat label={t("passportPage.countries")} value={countryGroups.length} />
                <HeroStat label="Points" value={profile?.total_points ?? 0} accent />
              </div>
            </div>
            <div className="hidden flex-col items-center md:flex">
              <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-amber-200/40 bg-amber-100 text-3xl font-extrabold text-amber-900 shadow-inner">
                {earnedBadgeList.length}
              </div>
              <div className="mt-2 text-xs tracking-widest uppercase text-amber-200/80">Badges earned</div>
            </div>
          </div>
        </div>

        {recentBadges.length > 0 && (
          <div className="cofex-app-card flex flex-wrap gap-2 p-4">
            <span className="w-full text-[10px] font-bold tracking-widest text-[color:var(--cofex-cyan)] uppercase">
              {t("passportPage.recentlyUnlocked")}
            </span>
            {recentBadges.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cofex-accent-gold)] px-3 py-1 text-xs font-semibold text-white"
              >
                <Sparkles className="h-3.5 w-3.5" /> {b.name}
              </span>
            ))}
          </div>
        )}

        <AppPageSection
          eyebrow={t("passportPage.beverageEyebrow")}
          title={t("passportPage.beverageTitle")}
          icon={<Coffee className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BEVERAGE_TAGS.map((b) => {
              const count = beverageCounts[b.id] ?? 0;
              return (
                <div key={b.id} className="cofex-app-card p-4 text-center">
                  <div className="text-2xl">{b.emoji}</div>
                  <div className="mt-1 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{count}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-black)]/55">
                    {t(b.labelKey)}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[color:var(--cofex-cyan)]">
                    {beverageTitle(count, b.id)}
                  </div>
                </div>
              );
            })}
          </div>
          <Link
            to="/crawls"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--cofex-cyan)] hover:underline"
          >
            {t("passportPage.crawlCta")} →
          </Link>
        </AppPageSection>

        <AppPageSection eyebrow={t("passportPage.collectAll")} title={t("passportPage.achievements")} icon={<Award className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                    className={`cofex-app-card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 ${
                      isEarned ? "ring-2 ring-[color:var(--cofex-accent-gold)]/40" : "opacity-90"
                    }`}
                  >
                    {isEarned && (
                      <div className="absolute top-3 right-3 rounded-full bg-[color:var(--cofex-accent-gold)] px-2 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
                        Earned
                      </div>
                    )}
                    <div
                      className={`relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${meta.from} ${meta.to} shadow-lg ${
                        isEarned ? "" : "opacity-50 grayscale"
                      }`}
                    >
                      <Icon className="h-8 w-8 text-white drop-shadow" />
                      {!isEarned && (
                        <div className="absolute -right-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full bg-[color:var(--cofex-coffee-deep)] text-white">
                          <Lock className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-4 font-bold text-[color:var(--cofex-coffee-deep)]">{b.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[color:var(--cofex-black)]/60">{b.description}</p>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-[color:var(--cofex-black)]/55">
                        <span>
                          {p.current} / {p.threshold}
                        </span>
                        <span>{p.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                        <div className={`h-full bg-gradient-to-r ${meta.from} ${meta.to}`} style={{ width: `${p.pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </AppPageSection>

        <AppPageSection
          eyebrow={t("passportPage.cityCollectionsSubtitle")}
          title={t("passportPage.cityCollections")}
          icon={<MapPin className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
        >
          {cityGroups.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={t("passportPage.noCityStamps")}
              description={t("passportPage.noCityStampsHint")}
              actionLabel={t("campaignsPage.emptyAction")}
              actionTo="/explore"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {cityGroups.map((g) => {
                const col = collectionByCity.get(g.city.toLowerCase());
                const target = col?.shops_target ?? 5;
                const visited = col?.visited ?? g.stamps.length;
                const pct = col?.pct ?? Math.min(100, Math.round((visited / target) * 100));
                return (
                <div key={`${g.city}-${g.country}`} className="cofex-app-card p-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <Link
                        to="/city/$city"
                        params={{ city: cityToSlug(g.city) }}
                        className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)] hover:underline"
                      >
                        {g.city}
                      </Link>
                      <p className="text-xs text-[color:var(--cofex-black)]/55">{g.country}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-[color:var(--cofex-accent-gold)]">
                        {visited}/{target}
                      </div>
                      <div className="text-[10px] tracking-widest text-[color:var(--cofex-black)]/45 uppercase">Collection</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[color:var(--cofex-cyan)] to-[color:var(--cofex-accent-gold)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {g.stamps.slice(0, 12).map((ci) => (
                      <Link
                        key={ci.id}
                        to="/coffee/$slug"
                        params={{ slug: ci.coffee_shops!.slug }}
                        title={ci.coffee_shops!.name}
                        className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[color:var(--cofex-accent-gold)]/70 bg-[color:var(--cofex-cream)] transition hover:scale-105"
                      >
                        {ci.coffee_shops?.logo_url || ci.coffee_shops?.cover_image_url ? (
                          <img
                            src={ci.coffee_shops.logo_url ?? ci.coffee_shops.cover_image_url ?? ""}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Coffee className="h-5 w-5 text-[color:var(--cofex-coffee-deep)]" />
                        )}
                      </Link>
                    ))}
                    {g.stamps.length > 12 && (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--cofex-cream)] text-xs text-[color:var(--cofex-black)]/60">
                        +{g.stamps.length - 12}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </AppPageSection>

        <AppPageSection
          eyebrow="The world, one cup at a time"
          title="Country collections"
          icon={<Globe2 className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
          className="pb-4"
        >
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
                  className="cofex-app-chip flex items-center gap-3 rounded-full py-2 pr-4 pl-2"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-white">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm leading-tight font-semibold text-[color:var(--cofex-coffee-deep)]">{country}</div>
                    <div className="text-xs text-[color:var(--cofex-black)]/55">
                      {count} stamp{count === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppPageSection>
      </AppPageBody>
    </AppPage>
  );
}

function HeroStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl px-4 py-2 ${
        accent
          ? "bg-[color:var(--cofex-pastel-blue)] text-[color:var(--cofex-coffee-deep)]"
          : "bg-white/10 text-white backdrop-blur"
      }`}
    >
      <div className="text-2xl leading-none font-extrabold">{value}</div>
      <div className="mt-1 text-[10px] tracking-widest uppercase opacity-80">{label}</div>
    </div>
  );
}
