import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AppPage, AppPageBody, AppPageSection } from "@/components/app/AppPageShell";
import {
  DEFAULT_RADAR_CENTER,
  useChallengeClaims,
  useClaimChallenge,
  useCoffeeRadar,
  useExplorerChallengeDefs,
  type RadarCampaign,
  type RadarShop,
} from "@/lib/queries/radar";
import { buildChallengeView, EXPLORER_CHALLENGES, weeklyResetLabel, limitedCountdownLabel } from "@/lib/explorer-challenges";
import { trackExplorerEvent } from "@/lib/explorer-analytics";
import { useUser } from "@/hooks/use-user";
import { useActiveSpawns, useActivePhotoChallenge } from "@/lib/queries/vision";
import { SpawnBanner } from "@/components/app/SpawnBanner";
import {
  Trophy,
  MapPin,
  Locate,
  ArrowRight,
  RadioTower,
  Check,
} from "lucide-react";
import { CofexIconTile, SectionIcon } from "@/components/app/CofexIconTile";
import {
  RADAR_SECTION_ICONS,
  RADAR_STAT_ICONS,
  challengeAccentToMeta,
} from "@/lib/explorer-section-icons";

export const Route = createFileRoute("/_authenticated/_explorer/radar")({
  head: () => ({
    meta: [
      { title: "Coffee Radar™ · CO:FE(X)" },
      { name: "description", content: "Today's free coffee, trending matcha, new campaigns and your explorer challenges, all in one daily pulse." },
    ],
  }),
  component: RadarPage,
});

type Shop = RadarShop;
type Campaign = RadarCampaign;

function RadarPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [now, setNow] = useState(new Date());
  const radarQuery = useCoffeeRadar(center);
  const spawnsQuery = useActiveSpawns(center?.[0], center?.[1]);
  const photoChallengeQuery = useActivePhotoChallenge();
  const claimsQuery = useChallengeClaims(user?.id);
  const defsQuery = useExplorerChallengeDefs();
  const claimMutation = useClaimChallenge(user?.id);
  const [celebration, setCelebration] = useState<{ id: string; points: number } | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`radar-claim-nudge-${new Date().toDateString()}`) === "1";
  });
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
    if (h < 11) return t("radar.goodMorning");
    if (h < 17) return t("radar.goodAfternoon");
    return t("radar.goodEvening");
  }, [now, t]);

  const challenges = defsQuery.data ?? EXPLORER_CHALLENGES;

  const challengeViews = useMemo(() => {
    const claims = claimsQuery.data?.claims ?? [];
    const weekPeriodKey = claimsQuery.data?.weekPeriodKey ?? "";
    return buildChallengeView(data?.stats, claims, weekPeriodKey, challenges);
  }, [data?.stats, claimsQuery.data, challenges]);

  const { limited: limitedViews, regular: regularViews } = useMemo(() => {
    const limited = challengeViews.filter((v) => v.challenge.period === "limited");
    const regular = challengeViews.filter((v) => v.challenge.period !== "limited");
    return { limited, regular };
  }, [challengeViews]);

  const claimableCount = challengeViews.filter((v) => v.claimable).length;
  const timeBonusHint = useMemo(() => {
    const h = now.getHours();
    if (h < 8) return t("radar.timeBonusEarlyBird");
    if (h >= 15 && h < 18) return t("radar.timeBonusHappyHour");
    return null;
  }, [now, t]);

  return (
    <AppPage>
      <AppPageBody className="pb-8 pt-2">
        <SpawnBanner spawns={spawnsQuery.data ?? []} />
        <Link
          to="/moments"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--cofex-cyan)]/25 bg-gradient-to-r from-[color:var(--cofex-pastel-blue)]/50 to-white px-4 py-3 transition hover:-translate-y-0.5"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-cyan)]">
              {t("moments.eyebrow")}
            </p>
            <p className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("moments.title")}</p>
            <p className="text-xs text-[color:var(--cofex-black)]/60">{t("moments.subtitle")}</p>
          </div>
          <SectionIcon meta={RADAR_SECTION_ICONS.moments} size="lg" />
        </Link>
        {timeBonusHint ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {timeBonusHint}
          </div>
        ) : null}
        {photoChallengeQuery.data ? (
          <div className="mb-4 rounded-2xl border border-[color:var(--cofex-cyan)]/30 bg-[color:var(--cofex-pastel-blue)]/40 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-cyan)]">
              {t("photoChallenge.weekly")}
            </div>
            <div className="font-semibold text-[color:var(--cofex-coffee-deep)]">{photoChallengeQuery.data.theme}</div>
            <div className="text-xs text-[color:var(--cofex-black)]/60">
              {t("photoChallenge.reward", { points: photoChallengeQuery.data.reward_points })}
            </div>
          </div>
        ) : null}
        {/* Hero */}
        {claimableCount > 0 && !nudgeDismissed && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--cofex-pastel-lilac)] px-4 py-3">
            <p className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
              {t("radar.rewardsReady", { count: claimableCount })}
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[color:var(--cofex-cyan)] underline"
              onClick={() => {
                setNudgeDismissed(true);
                localStorage.setItem(`radar-claim-nudge-${new Date().toDateString()}`, "1");
              }}
            >
              {t("radar.dismiss")}
            </button>
          </div>
        )}
        <div className="cofex-premium-hero mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color:var(--cofex-cyan)]/30 bg-[color:var(--cofex-pastel-blue)] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[color:var(--cofex-coffee-deep)] sm:text-[10px] sm:tracking-[0.3em]">
              <RadioTower className="h-3 w-3 shrink-0 animate-pulse text-[color:var(--cofex-cyan)]" /> {t("radar.liveBadge")}
            </div>
            <h1 className="relative mt-3 text-3xl font-extrabold leading-[1.05] text-[color:var(--cofex-coffee-deep)] sm:text-4xl md:text-5xl">
              {greeting}.<br />
              <span className="cofex-hero-shine">{t("radar.pulse")}</span>
            </h1>
            <p className="relative mt-2 max-w-md text-sm text-[color:var(--cofex-black)]/65">
              Scanned {data?.free_today.length ?? 0} free-coffee spots, {data?.trending_matcha.length ?? 0} trending matcha bars, {data?.new_campaigns.length ?? 0} fresh campaigns within 5 km.
            </p>
          </div>

          <RadarSweep />
        </div>

        {/* Stat strip */}
        <div className="cofex-app-card mt-6 grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
          <Stat iconMeta={RADAR_STAT_ICONS[0]} label="Streak" value={`${data?.stats.streak_days ?? 0}d`} accent="from-amber-400 to-orange-500" />
          <Stat iconMeta={RADAR_STAT_ICONS[1]} label="This week" value={data?.stats.visits_this_week ?? 0} accent="from-rose-400 to-pink-500" />
          <Stat iconMeta={RADAR_STAT_ICONS[2]} label="Cities" value={data?.stats.cities_explored ?? 0} accent="from-emerald-400 to-teal-500" />
          <Stat iconMeta={RADAR_STAT_ICONS[3]} label="Points" value={data?.stats.total_points ?? 0} accent="from-violet-400 to-fuchsia-500" />
        </div>

        {/* Location chip */}
        <div className="mt-5 flex flex-col gap-2 text-xs text-[color:var(--cofex-black)]/60 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
            Radius 5 km · {center ? "Your location" : "Lisbon (default)"}
          </span>
          <button
            onClick={useMyLocation}
            disabled={locating}
            className="cofex-app-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            <Locate className={`h-3.5 w-3.5 ${locating ? "animate-spin" : ""}`} />
            {locating ? "Locating…" : center ? "Update" : "Use my location"}
          </button>
        </div>

        <AppPageSection
          eyebrow="Today only"
          title={`${data?.free_today.length ?? 0} cafés nearby offering free coffee`}
          icon={<SectionIcon meta={RADAR_SECTION_ICONS.freeCoffee} />}
        >
          {loading ? (
            <SectionSkeleton />
          ) : (data?.free_today.length ?? 0) === 0 ? (
            <SectionEmpty message="No free-coffee spots in your radius right now. Widen your range or check back tomorrow." />
          ) : (
            <HScroll>
              {data?.free_today.map((s) => (
                <FreeCard key={s.id} shop={s} />
              ))}
            </HScroll>
          )}
        </AppPageSection>

        <AppPageSection
          eyebrow="Heating up"
          title="Trending Matcha spots"
          icon={<SectionIcon meta={RADAR_SECTION_ICONS.matcha} />}
        >
          {loading ? (
            <SectionSkeleton grid />
          ) : (data?.trending_matcha.length ?? 0) === 0 ? (
            <SectionEmpty message="No matcha bars trending yet. Be the first to check in." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data?.trending_matcha.map((s, i) => (
                <TrendingCard key={s.id} shop={s} rank={i + 1} />
              ))}
            </div>
          )}
        </AppPageSection>

        <AppPageSection
          eyebrow="Fresh drops"
          title="New EEFFOC campaigns"
          icon={<SectionIcon meta={RADAR_SECTION_ICONS.campaigns} />}
        >
          {loading ? (
            <SectionSkeleton />
          ) : (data?.new_campaigns.length ?? 0) === 0 ? (
            <SectionEmpty message="No new campaigns this week. Visit /campaigns to see active ones." />
          ) : (
            <HScroll>
              {data?.new_campaigns.map((c) => (
                <CampaignCard key={c.id} c={c} now={now} />
              ))}
            </HScroll>
          )}
        </AppPageSection>

        {limitedViews.length > 0 && (
          <AppPageSection
            eyebrow="Limited time"
            title="Seasonal challenges"
            icon={<SectionIcon meta={RADAR_SECTION_ICONS.challenges} />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {limitedViews.map((view) => (
                <ChallengeCard
                  key={view.challenge.id}
                  view={view}
                  weekPeriodKey={claimsQuery.data?.weekPeriodKey}
                  celebrating={celebration?.id === view.challenge.id}
                  celebrationPoints={celebration?.points}
                  claiming={claimMutation.isPending && claimMutation.variables === view.challenge.id}
                  onClaim={async () => {
                    try {
                      const result = await claimMutation.mutateAsync(view.challenge.id);
                      trackExplorerEvent("challenge_claimed", {
                        challenge_id: view.challenge.id,
                        points: result.points_awarded,
                      });
                      trackExplorerEvent("seasonal_challenge_viewed", { challenge_id: view.challenge.id });
                      setCelebration({ id: view.challenge.id, points: result.points_awarded });
                      window.setTimeout(() => setCelebration(null), 2500);
                      toast.success(`+${result.points_awarded} pts. Challenge claimed!`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not claim");
                    }
                  }}
                />
              ))}
            </div>
          </AppPageSection>
        )}

        <AppPageSection
          eyebrow="Earn this week"
          title="Explorer Challenges"
          icon={<SectionIcon meta={RADAR_SECTION_ICONS.challenges} />}
          action={
            <div className="flex items-center gap-3">
              <Link
                to="/passport"
                className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)] underline-offset-2 hover:underline"
              >
                City collections →
              </Link>
              <Link
                to="/leaderboard"
                className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)] underline-offset-2 hover:underline"
              >
                Leaderboard →
              </Link>
            </div>
          }
        >
          {loading || claimsQuery.isLoading ? (
            <SectionSkeleton grid />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {regularViews.map((view) => (
                <ChallengeCard
                  key={view.challenge.id}
                  view={view}
                  weekPeriodKey={claimsQuery.data?.weekPeriodKey}
                  celebrating={celebration?.id === view.challenge.id}
                  celebrationPoints={celebration?.points}
                  claiming={claimMutation.isPending && claimMutation.variables === view.challenge.id}
                  onClaim={async () => {
                    try {
                      const result = await claimMutation.mutateAsync(view.challenge.id);
                      trackExplorerEvent("challenge_claimed", {
                        challenge_id: view.challenge.id,
                        points: result.points_awarded,
                      });
                      setCelebration({ id: view.challenge.id, points: result.points_awarded });
                      window.setTimeout(() => setCelebration(null), 2500);
                      toast.success(`+${result.points_awarded} pts. Challenge claimed!`);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not claim");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </AppPageSection>

        <p className="mb-6 mt-10 text-center text-[11px] text-[color:var(--cofex-black)]/40">
          Updated {data ? new Date(data.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"} · Coffee Radar™
        </p>
      </AppPageBody>
    </AppPage>
  );
}

/* ---------- Pieces ---------- */

function RadarSweep() {
  return (
    <div className="relative h-28 w-28 shrink-0">
      <div className="absolute inset-0 rounded-full border border-[color:var(--cofex-cyan)]/30" />
      <div className="absolute inset-3 rounded-full border border-[color:var(--cofex-cyan)]/20" />
      <div className="absolute inset-6 rounded-full border border-[color:var(--cofex-cyan)]/10" />
      <div
        className="cofex-radar-sweep absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, rgba(0,180,200,0) 0deg, rgba(0,180,200,0.45) 60deg, rgba(0,180,200,0) 90deg)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <CofexIconTile rewardType="coffee" size="sm" />
      </div>
      <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[color:var(--cofex-cyan)] shadow-[0_0_12px_color-mix(in_oklab,var(--cofex-cyan)_80%,transparent)]" />
    </div>
  );
}

function Stat({
  iconMeta,
  label,
  value,
  accent,
}: {
  iconMeta: (typeof RADAR_STAT_ICONS)[number];
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="cofex-stat-tile px-3 py-2">
      <div className={`absolute -right-4 -top-4 h-12 w-12 rounded-full bg-gradient-to-br ${accent} opacity-25 blur-xl`} />
      <div className="relative flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50 sm:text-[10px] sm:tracking-widest">
        <CofexIconTile meta={iconMeta} size="xs" />
        <span className="truncate">{label}</span>
      </div>
      <div className="relative mt-0.5 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)] sm:text-xl">{value}</div>
    </div>
  );
}

function SectionSkeleton({ grid = false }: { grid?: boolean }) {
  if (grid) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="cofex-app-card h-24 animate-pulse bg-[color:var(--cofex-cream)]/60" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex gap-3 overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="cofex-app-card h-44 w-64 shrink-0 animate-pulse bg-[color:var(--cofex-cream)]/60" />
      ))}
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="cofex-app-card cofex-app-card-dashed cofex-empty-state px-6 py-8">
      <CofexIconTile rewardType="coffee" size="xl" className="mx-auto" />
      <p className="mt-3 text-sm font-medium text-[color:var(--cofex-black)]/65">{message}</p>
    </div>
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
      className="cofex-app-card group relative w-64 shrink-0 overflow-hidden transition hover:-translate-y-1"
    >
      <div className="relative h-32 overflow-hidden">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-amber-400/30 to-rose-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white shadow-lg" style={{ background: "var(--gradient-coffee)" }}>
          <CofexIconTile meta={RADAR_SECTION_ICONS.freeCoffee} size="xs" /> FREE TODAY
        </span>
        {shop.distance_km != null && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-amber-100 backdrop-blur">
            {shop.distance_km < 1 ? `${Math.round(shop.distance_km * 1000)} m` : `${shop.distance_km.toFixed(1)} km`}
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="truncate font-bold text-[color:var(--cofex-coffee-deep)]">{shop.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-[color:var(--cofex-black)]/55">{shop.city ?? "Nearby"} · ★ {Number(shop.rating).toFixed(1)}</div>
      </div>
    </Link>
  );
}

function TrendingCard({ shop, rank }: { shop: Shop; rank: number }) {
  return (
    <Link
      to="/coffee/$slug"
      params={{ slug: shop.slug }}
      className="cofex-app-card group flex gap-3 overflow-hidden p-2 transition hover:-translate-y-0.5"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/40 to-teal-700/40">
            <CofexIconTile rewardType="matcha" size="md" />
          </div>
        )}
        <span className="absolute top-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-200">#{rank}</span>
      </div>
      <div className="flex-1 min-w-0 py-1 pr-2">
        <div className="truncate font-bold text-[color:var(--cofex-coffee-deep)]">{shop.name}</div>
        <div className="truncate text-[11px] text-[color:var(--cofex-black)]/55">{shop.city ?? "-"}</div>
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <CofexIconTile meta={RADAR_SECTION_ICONS.matcha} size="xs" /> {shop.recent_visits ?? 0} check-ins · 14d
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
      className="cofex-campaign-card cofex-app-card group relative w-72 shrink-0 overflow-hidden"
    >
      <div className="cofex-campaign-card-media relative h-36 overflow-hidden">
        {c.cover_image_url ? (
          <img src={c.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-rose-500/40 via-orange-500/30 to-amber-400/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-rose-300 px-2 py-0.5 text-[10px] font-extrabold text-rose-950">
          <CofexIconTile meta={RADAR_SECTION_ICONS.challenges} size="xs" /> +{c.points_reward} pts
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
      <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[color:var(--cofex-black)]/60">
        <span className="truncate">{c.reward_description ?? "Tap to view"}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[color:var(--cofex-coffee-deep)]">{c.participants} joined <ArrowRight className="h-3 w-3" /></span>
      </div>
    </Link>
  );
}

/* ---------- Challenges ---------- */

function ChallengeCard({
  view,
  onClaim,
  claiming,
  weekPeriodKey,
  celebrating,
  celebrationPoints,
}: {
  view: ReturnType<typeof buildChallengeView>[number];
  onClaim: () => void;
  claiming: boolean;
  weekPeriodKey?: string;
  celebrating?: boolean;
  celebrationPoints?: number;
}) {
  const { challenge, progress, pct, claimable, claimed } = view;
  const Icon = challenge.Icon;
  const challengeIconMeta = challengeAccentToMeta(challenge.accent, Icon);
  const resetCopy =
    weeklyResetLabel(challenge, weekPeriodKey) ??
    limitedCountdownLabel(challenge);

  return (
    <div
      className={`cofex-app-card relative overflow-hidden p-4 transition-transform ${
        claimed ? "opacity-80" : claimable ? "ring-2 ring-emerald-300/70" : ""
      } ${celebrating ? "scale-[1.02] ring-2 ring-[color:var(--cofex-accent-gold)]" : ""}`}
    >
      {celebrating && celebrationPoints != null && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-[2px]">
          <div className="animate-bounce text-center">
            <CofexIconTile meta={RADAR_SECTION_ICONS.challenges} size="lg" />
            <div className="mt-1 text-2xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
              +{celebrationPoints} pts
            </div>
          </div>
        </div>
      )}
      <div className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${challenge.accent} opacity-20 blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[color:var(--cofex-cyan)] uppercase">
            <CofexIconTile meta={challengeIconMeta} size="xs" /> Challenge
          </div>
          <div className="mt-1 font-bold text-[color:var(--cofex-coffee-deep)]">{challenge.title}</div>
          <div className="text-[12px] text-[color:var(--cofex-black)]/60">{challenge.subtitle}</div>
          {resetCopy ? (
            <div className="mt-0.5 text-[10px] text-[color:var(--cofex-black)]/45">{resetCopy}</div>
          ) : null}
        </div>
        <div
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold ${
            claimed
              ? "bg-emerald-100 text-emerald-800"
              : "bg-[color:var(--cofex-pastel-blue)] text-[color:var(--cofex-coffee-deep)]"
          }`}
        >
          {claimed ? (
            <span className="inline-flex items-center gap-0.5">
              <Check className="h-3 w-3" /> Claimed
            </span>
          ) : (
            `+${challenge.reward} pts`
          )}
        </div>
      </div>
      <div className="relative mt-3">
        <div className="flex items-center justify-between text-[11px] text-[color:var(--cofex-black)]/55">
          <span>
            {progress} / {challenge.target}
          </span>
          <span>{claimed ? "Done" : claimable ? "Ready!" : `${pct}%`}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
          <div className={`h-full rounded-full bg-gradient-to-r ${challenge.accent} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {claimable && (
        <button
          type="button"
          onClick={onClaim}
          disabled={claiming}
          className="relative mt-3 w-full rounded-full bg-[color:var(--cofex-coffee-deep)] py-2 text-xs font-semibold text-white transition hover:bg-[color:var(--cofex-black)] disabled:opacity-60"
        >
          {claiming ? "Claiming…" : `Claim +${challenge.reward} pts`}
        </button>
      )}
    </div>
  );
}
