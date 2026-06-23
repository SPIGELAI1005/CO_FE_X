import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  Gift,
} from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useUser } from "@/hooks/use-user";
import { usePassport, type PassportBadge, type PassportCheckIn } from "@/lib/queries/passport";
import { usePassportStamps } from "@/lib/queries/passport-stamps";
import { PassportStampCard } from "@/components/app/PassportStampCard";
import { PassportShareButton } from "@/components/app/PassportShareButton";
import {
  computeFavoriteRewardType,
  PASSPORT_STAMP_CATEGORIES,
  STAMP_CATEGORY_LABEL_KEYS,
  type PassportStampCategory,
} from "@/lib/passport-stamps";
import { useUserCityCollections, type UserCityCollection } from "@/lib/queries/city-collections";
import { useBeveragePassport } from "@/lib/queries/vision";
import { useBadgeStats } from "@/lib/queries/badges";
import { BadgeDetailDialog, type BadgeDetail } from "@/components/app/BadgeDetailDialog";
import {
  badgeIconMeta,
  badgeProgress,
  BADGE_RARITY_STYLES,
  normalizeBadgeRarity,
  type BadgeCriteria,
  type ExplorerBadgeStats,
  EMPTY_BADGE_STATS,
} from "@/lib/badges";
import { BEVERAGE_TAGS, beverageTitle } from "@/lib/beverage-tags";
import { cityToSlug } from "@/lib/cities";

export const Route = createFileRoute("/_authenticated/_explorer/passport")({
  head: () => ({ meta: [{ title: "Passport · CO:FE(X)" }] }),
  component: PassportPage,
});

type Badge = PassportBadge;
type CheckIn = PassportCheckIn;

function PassportPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const passportQuery = usePassport(user?.id);
  const badgeStatsQuery = useBadgeStats(user?.id);
  const stampQuery = usePassportStamps(user?.id);
  const collectionsQuery = useUserCityCollections(user?.id);
  const beverageQuery = useBeveragePassport(user?.id);

  return (
    <QueryBoundary query={passportQuery} loadingLabel={t("passportPage.loading")}>
      {(data) => (
        <PassportContent
          data={data}
          badgeStats={badgeStatsQuery.data ?? EMPTY_BADGE_STATS}
          stampStats={stampQuery.data}
          stampsLoading={stampQuery.isLoading}
          collections={collectionsQuery.data ?? []}
          beverageCounts={beverageQuery.data ?? {}}
        />
      )}
    </QueryBoundary>
  );
}

function PassportContent({
  data,
  badgeStats,
  stampStats,
  stampsLoading,
  collections,
  beverageCounts,
}: {
  data: NonNullable<ReturnType<typeof usePassport>["data"]>;
  badgeStats: ExplorerBadgeStats;
  stampStats: ReturnType<typeof usePassportStamps>["data"];
  stampsLoading: boolean;
  collections: UserCityCollection[];
  beverageCounts: Record<string, number>;
}) {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState<PassportStampCategory | "all">("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeDetail | null>(null);
  const { profile, badges, earnedBadgeIds: earned, earnedBadges, checkIns } = data;

  const earnedAtByBadge = useMemo(() => {
    const m = new Map<string, string>();
    for (const eb of earnedBadges) m.set(eb.badge_id, eb.earned_at);
    return m;
  }, [earnedBadges]);

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

  const rewardStamps = stampStats?.stamps ?? [];
  const favoriteType = computeFavoriteRewardType(rewardStamps);
  const favoriteLabel = favoriteType ? t(`campaignMap.rewardTypes.${favoriteType}`) : null;
  const filteredStamps =
    categoryFilter === "all"
      ? rewardStamps
      : rewardStamps.filter((s) => s.stamp_category === categoryFilter);

  const cafeCount = Math.max(badgeStats.unique_shops, stampStats?.uniqueCafesFromStamps ?? 0);
  const cityCount = Math.max(cityGroups.length, stampStats?.citiesDiscovered ?? 0);
  const rewardCount = profile?.total_rewards_redeemed ?? stampStats?.totalRewards ?? 0;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.passport.eyebrow")}
        title={profile?.display_name ?? t("pages.profile.titleFallback")}
        subtitle={t("pages.passport.subtitle")}
      />
      <AppPageBody className="space-y-2 pb-8">
        <div className="cofex-passport-cover text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_60%,var(--cofex-pastel-blue),transparent_45%)] opacity-20" />
          <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full border-[14px] border-white/15" />
          <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase text-amber-200/80">
                <StampIcon className="h-3.5 w-3.5" /> {t("passportPage.yourJourney")}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <HeroStat label={t("passportPage.uniqueCafes")} value={cafeCount} />
                <HeroStat label={t("passportPage.rewardsCollected")} value={rewardCount} />
                <HeroStat label={t("passportPage.cities")} value={cityCount} />
                <HeroStat label={t("passportPage.neighborhoods")} value={stampStats?.neighborhoods.length ?? cityCount} />
                {favoriteLabel && (
                  <div className="col-span-2 rounded-xl bg-white/10 px-4 py-2 text-white backdrop-blur sm:col-span-1">
                    <div className="text-[10px] tracking-widest uppercase opacity-80">{t("passportPage.favoriteReward")}</div>
                    <div className="mt-1 text-sm font-bold">{favoriteLabel}</div>
                  </div>
                )}
                <HeroStat label={t("passportPage.points")} value={profile?.total_points ?? 0} accent />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 md:items-end">
              <PassportShareButton
                explorerName={profile?.display_name ?? t("pages.profile.titleFallback")}
                stampCount={rewardStamps.length}
                cafeCount={cafeCount}
                cityCount={cityCount}
                rewardCount={rewardCount}
                favoriteRewardLabel={favoriteLabel}
              />
              <div className="hidden flex-col items-center md:flex">
                <div className="grid h-24 w-24 place-items-center rounded-full border-4 border-amber-200/40 bg-amber-100 text-3xl font-extrabold text-amber-900 shadow-inner">
                  {earnedBadgeList.length}
                </div>
                <div className="mt-2 text-xs tracking-widest uppercase text-amber-200/80">{t("passportPage.badgesEarned")}</div>
              </div>
            </div>
          </div>
        </div>

        <AppPageSection
          eyebrow={t("passportPage.stampCollectionEyebrow")}
          title={t("passportPage.stampCollectionTitle")}
          subtitle={t("passportPage.stampCollectionSubtitle")}
          icon={<StampIcon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <CategoryChip active={categoryFilter === "all"} onClick={() => setCategoryFilter("all")} label={t("passportPage.categories.all")} />
            {PASSPORT_STAMP_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                active={categoryFilter === cat}
                onClick={() => setCategoryFilter(cat)}
                label={t(STAMP_CATEGORY_LABEL_KEYS[cat])}
              />
            ))}
          </div>

          {stampsLoading ? (
            <p className="py-8 text-center text-sm text-[color:var(--cofex-black)]/55">{t("passportPage.loadingStamps")}</p>
          ) : filteredStamps.length === 0 ? (
            <EmptyState
              icon={Gift}
              title={t("passportPage.noRewardStamps")}
              description={t("passportPage.noRewardStampsHint")}
              actionLabel={t("passportPage.exploreCampaigns")}
              actionTo="/campaigns"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredStamps.map((stamp, i) => (
                <PassportStampCard key={stamp.id} stamp={stamp} index={i} />
              ))}
            </div>
          )}
        </AppPageSection>

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
                const p = badgeProgress(b.criteria as BadgeCriteria, badgeStats);
                const meta = badgeIconMeta(b.slug);
                const Icon = meta.Icon;
                const rarity = normalizeBadgeRarity(b.rarity);
                const rarityStyle = BADGE_RARITY_STYLES[rarity];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setSelectedBadge({
                        id: b.id,
                        slug: b.slug,
                        name: b.name,
                        description: b.description,
                        rarity: b.rarity,
                        criteria: b.criteria as BadgeCriteria,
                        earnedAt: earnedAtByBadge.get(b.id),
                        isEarned,
                      })
                    }
                    className={`cofex-badge-card cofex-app-card group relative overflow-hidden p-5 text-left ${
                      isEarned ? `cofex-badge-card--earned ring-2 ${rarityStyle.ring}` : "opacity-90"
                    }`}
                  >
                    <span
                      className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rarityStyle.chip}`}
                    >
                      {t(rarityStyle.labelKey)}
                    </span>
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
                  </button>
                );
              })}
          </div>
        </AppPageSection>

        <BadgeDetailDialog badge={selectedBadge} stats={badgeStats} onClose={() => setSelectedBadge(null)} />

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

function CategoryChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[color:var(--cofex-coffee-deep)] text-white shadow"
          : "border border-[color:var(--border)] bg-white text-[color:var(--cofex-black)]/65 hover:border-[color:var(--cofex-cyan)]"
      }`}
    >
      {label}
    </button>
  );
}
