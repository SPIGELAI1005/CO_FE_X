import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import {
  useLeaderboard,
  useMyLeaderboardRank,
  myRankToLeaderboardRow,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "@/lib/queries/leaderboard";
import { useUser } from "@/hooks/use-user";
import { levelFor, levelDisplayName } from "@/lib/explorer-levels";
import { trackExplorerEvent } from "@/lib/explorer-analytics";
import { useProfile } from "@/lib/queries/profile";
import { cityToSlug } from "@/lib/cities";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { LEADERBOARD_METRIC_ICONS, LEADERBOARD_PODIUM_ICONS } from "@/lib/explorer-section-icons";
export const Route = createFileRoute("/_authenticated/_explorer/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard · CO:FE(X)" }] }),
  component: LeaderboardPage,
});

const METRIC_KEYS: {
  id: LeaderboardMetric;
  labelKey: string;
  field: keyof LeaderboardRow;
  suffix?: string;
}[] = [
  { id: "points", labelKey: "leaderboardPage.metrics.points", field: "total_points", suffix: "pts" },
  { id: "cafes", labelKey: "leaderboardPage.metrics.cafes", field: "cafes_visited" },
  { id: "reviews", labelKey: "leaderboardPage.metrics.reviews", field: "reviews_written" },
  { id: "campaigns", labelKey: "leaderboardPage.metrics.campaigns", field: "campaigns_completed" },
  { id: "social", labelKey: "leaderboardPage.metrics.social", field: "social_posts" },
];

interface LeaderboardMetricItem {
  id: LeaderboardMetric;
  label: string;
  labelKey: string;
  field: keyof LeaderboardRow;
  suffix?: string;
}

function LeaderboardPage() {
  const { t } = useTranslation();
  const [metric, setMetric] = useState<LeaderboardMetric>("points");
  const [scope, setScope] = useState<"global" | "city">("global");
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const citySlug = scope === "city" && profile?.city ? cityToSlug(profile.city) : null;
  const leaderboardQuery = useLeaderboard(metric, citySlug);
  const myRankQuery = useMyLeaderboardRank(metric, user?.id, citySlug);
  const metrics = useMemo(
    () => METRIC_KEYS.map((m) => ({ ...m, label: t(m.labelKey) })),
    [t],
  );
  const activeMetric = metrics.find((m) => m.id === metric)!;

  useEffect(() => {
    trackExplorerEvent("leaderboard_opened", { metric });
  }, [metric]);

  return (    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.leaderboard.eyebrow")}
        title={t("pages.leaderboard.title")}
        subtitle={t("pages.leaderboard.subtitle")}
      />
      <AppPageBody className="max-w-4xl pb-8">
        <div className="mb-4 flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setScope("global")}
            className={`cofex-app-chip rounded-full px-3.5 py-1.5 text-xs font-medium ${scope === "global" ? "cofex-app-chip-active" : ""}`}
          >
            {t("leaderboardPage.global")}
          </button>
          {profile?.city && (
            <button
              type="button"
              onClick={() => setScope("city")}
              className={`cofex-app-chip inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-medium ${scope === "city" ? "cofex-app-chip-active" : ""}`}
            >
              <MapPin className="h-3 w-3" /> {profile.city}
            </button>
          )}
        </div>
        <div className="cofex-chip-scroll-row mb-6">
          {metrics.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                metric === m.id ? "cofex-app-chip-active" : ""
              }`}
            >
              <CofexIconTile meta={LEADERBOARD_METRIC_ICONS[m.id]} size="xs" /> {m.label}
            </button>
          ))}
        </div>

        <QueryBoundary query={leaderboardQuery} loadingLabel={t("leaderboardPage.loading")}>
          {(rows) => {
            const meInList = rows.find((r) => r.user_id === user?.id);
            const me =
              meInList ??
              (myRankQuery.data?.rank
                ? myRankToLeaderboardRow(myRankQuery.data)
                : undefined);
            const top3 = rows.slice(0, 3);
            const rest = rows.slice(3);
            if (rows.length === 0) {
              return (
                <div className="cofex-app-card-dashed cofex-app-card py-16 text-center text-sm text-[color:var(--cofex-black)]/60">
                  {t("leaderboardPage.empty")}
                </div>
              );
            }

            return (
              <>
                {me && (
                  <MyCard
                    row={me}
                    metric={activeMetric}
                    totalExplorers={myRankQuery.data?.total_explorers}
                    outsideTop50={!meInList}
                  />
                )}                <div className="mb-8 grid grid-cols-3 items-end gap-3">
                  {[top3[1], top3[0], top3[2]].map((r, i) =>
                    r ? (
                      <PodiumCard
                        key={r.user_id}
                        row={r}
                        metric={activeMetric}
                        place={i === 1 ? 1 : i === 0 ? 2 : 3}
                      />
                    ) : (
                      <div key={i} />
                    ),
                  )}
                </div>
                <div className="space-y-2">
                  {rest.map((r) => (
                    <RankRow key={r.user_id} row={r} metric={activeMetric} highlight={r.user_id === user?.id} />
                  ))}
                </div>
              </>
            );
          }}
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}

function MyCard({
  row,
  metric,
  totalExplorers,
  outsideTop50,
}: {
  row: LeaderboardRow;
  metric: LeaderboardMetricItem;
  totalExplorers?: number;
  outsideTop50?: boolean;
}) {
  const { t } = useTranslation();
  const value = row[metric.field] as number;
  const { level, next, progress, idx } = levelFor(row.total_points);
  const LevelIcon = level.Icon;

  return (
    <div className={`cofex-app-card relative mb-6 overflow-hidden bg-gradient-to-br ${level.gradient} p-5 text-white shadow-xl`}>
      <LevelIcon className="absolute -top-4 -right-4 h-28 w-28 opacity-10" />
      <div className="relative flex items-center gap-4">
        <Avatar url={row.avatar_url} name={row.display_name} size={56} ring />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-widest uppercase opacity-80">
            {t("leaderboardPage.youRank", { rank: row.rank })}
            {totalExplorers ? ` · ${totalExplorers.toLocaleString()}` : ""}
            {outsideTop50 ? ` · ${t("leaderboardPage.outsideTop50")}` : ""}
          </div>
          <div className="truncate text-lg font-bold">{row.display_name ?? t("pages.profile.titleFallback")}</div>
          <div className="inline-flex items-center gap-1 text-xs opacity-90">
            <LevelIcon className="h-3.5 w-3.5" />{" "}
            {t("levels.levelN", { n: idx + 1, name: levelDisplayName(level, t) })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl leading-none font-extrabold">{value.toLocaleString()}</div>
          <div className="mt-0.5 text-[10px] tracking-widest uppercase opacity-80">{metric.label}</div>
        </div>
      </div>
      {next && (
        <div className="relative mt-4">
          <div className="mb-1 flex items-center justify-between text-[11px] opacity-90">
            <span>{row.total_points.toLocaleString()} pts</span>
            <span>
              {next.min.toLocaleString()} pts → {levelDisplayName(next, t)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function PodiumCard({
  row,
  metric,
  place,
}: {
  row: LeaderboardRow;
  metric: LeaderboardMetricItem;
  place: 1 | 2 | 3;
}) {
  const { t } = useTranslation();
  const value = row[metric.field] as number;
  const { level } = levelFor(row.total_points);
  const LevelIcon = level.Icon;
  const heights = { 1: "pt-8 pb-6", 2: "pt-6 pb-5", 3: "pt-5 pb-4" };
  const icons = {
    1: <CofexIconTile meta={LEADERBOARD_PODIUM_ICONS[1]} size="sm" />,
    2: <CofexIconTile meta={LEADERBOARD_PODIUM_ICONS[2]} size="sm" />,
    3: <CofexIconTile meta={LEADERBOARD_PODIUM_ICONS[3]} size="sm" />,
  };
  const colors = {
    1: "border-amber-400 bg-gradient-to-b from-amber-200 via-amber-300 to-orange-400 text-amber-950",
    2: "border-slate-300 bg-gradient-to-b from-slate-100 to-slate-300 text-slate-800",
    3: "border-orange-300 bg-gradient-to-b from-orange-100 to-orange-300 text-orange-950",
  };

  return (
    <div className={`cofex-app-card relative px-3 text-center ${colors[place]} ${heights[place]}`}>
      <div className="absolute -top-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border bg-white shadow">
        {icons[place]}
      </div>
      <div className="mt-2 flex flex-col items-center gap-2">
        <Avatar url={row.avatar_url} name={row.display_name} size={place === 1 ? 64 : 52} ring />
        <div className="w-full min-w-0">
          <div className="truncate text-sm font-bold">{row.display_name ?? t("pages.profile.titleFallback")}</div>
          <div className="inline-flex items-center gap-1 truncate text-[10px] opacity-80">
            <LevelIcon className="h-3 w-3" /> {levelDisplayName(level, t)}
          </div>
        </div>
        <div className="rounded-full bg-white/60 px-3 py-1 backdrop-blur">
          <div className="text-lg leading-none font-extrabold">{value.toLocaleString()}</div>
          <div className="text-[9px] tracking-widest uppercase opacity-80">
            {metric.suffix ?? metric.label.split(" ")[0]}
          </div>
        </div>
      </div>
    </div>
  );
}

function RankRow({
  row,
  metric,
  highlight,
}: {
  row: LeaderboardRow;
  metric: LeaderboardMetricItem;
  highlight?: boolean;
}) {
  const { t } = useTranslation();
  const value = row[metric.field] as number;
  const { level } = levelFor(row.total_points);
  const LevelIcon = level.Icon;

  return (
    <div
      className={`cofex-app-card flex items-center gap-3 px-4 py-3 transition hover:-translate-y-0.5 ${
        highlight ? "ring-2 ring-[color:var(--cofex-cyan)]" : ""
      }`}
    >
      <div className="w-8 text-center text-sm font-bold text-[color:var(--cofex-black)]/40">#{row.rank}</div>
      <Avatar url={row.avatar_url} name={row.display_name} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
          {row.display_name ?? t("pages.profile.titleFallback")}
          {row.city ? <span className="font-normal text-[color:var(--cofex-black)]/45"> · {row.city}</span> : null}
        </div>
        <div className="mt-0.5 inline-flex items-center gap-2 text-[11px] text-[color:var(--cofex-black)]/55">
          <span className="inline-flex items-center gap-0.5">
            <LevelIcon className="h-3 w-3" /> {levelDisplayName(level, t)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <CofexIconTile meta={LEADERBOARD_METRIC_ICONS.cafes} size="xs" /> {row.cafes_visited}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg leading-none font-bold text-[color:var(--cofex-coffee-deep)]">
          {value.toLocaleString()}
        </div>
        <div className="mt-0.5 text-[9px] tracking-widest text-[color:var(--cofex-black)]/40 uppercase">
          {metric.suffix ?? metric.label.split(" ")[0]}
        </div>
      </div>
    </div>
  );
}

function Avatar({
  url,
  name,
  size = 40,
  ring,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const initials = (name ?? "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return url ? (
    <img
      src={url}
      alt=""
      style={{ width: size, height: size }}
      className={`rounded-full object-cover ${ring ? "ring-2 ring-white/70" : ""}`}
    />
  ) : (
    <div
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 font-bold text-white ${
        ring ? "ring-2 ring-white/70" : ""
      }`}
    >
      {initials}
    </div>
  );
}
