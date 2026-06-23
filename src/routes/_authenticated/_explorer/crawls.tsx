import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { TRAIL_STAT_ICONS } from "@/lib/explorer-section-icons";
import { useUser } from "@/hooks/use-user";
import { useCoffeeCrawls, useCrawlProgress } from "@/lib/queries/vision";
import { formatTrailDistance, formatTrailDuration, trailProgressPct, trailThemeLabelKey } from "@/lib/trails";

export const Route = createFileRoute("/_authenticated/_explorer/crawls")({
  head: () => ({ meta: [{ title: "Trails · CO:FE(X)" }] }),
  component: TrailsPage,
});

function TrailsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const crawlsQuery = useCoffeeCrawls();
  const progressQuery = useCrawlProgress(user?.id);

  const progressMap = new Map((progressQuery.data ?? []).map((p) => [p.crawl_id, p]));

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("trails.eyebrow")}
        title={t("trails.title")}
        subtitle={t("trails.subtitle")}
      />
      <AppPageBody className="mx-auto max-w-2xl space-y-4 pb-10">
        <QueryBoundary query={crawlsQuery} loadingLabel={t("trails.loading")}>
          {(crawls) =>
            crawls.length === 0 ? (
              <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("trails.empty")}</p>
            ) : (
              crawls.map((trail) => {
                const prog = progressMap.get(trail.id);
                const done = prog?.stops_done ?? trail.stops_done ?? 0;
                const total = prog?.stop_count ?? trail.stop_count ?? trail.stops.length;
                const pct = trailProgressPct(done, total);
                const joined = prog?.joined ?? trail.joined ?? false;
                const completed = prog?.completed ?? trail.completed ?? false;

                return (
                  <Link
                    key={trail.id}
                    to="/crawls/$slug"
                    params={{ slug: trail.slug }}
                    className="cofex-app-card block overflow-hidden transition hover:-translate-y-0.5"
                  >
                    <div className="bg-gradient-to-br from-[color:var(--cofex-coffee-deep)] to-[#2a1810] px-5 py-4 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/70">
                            {t(trailThemeLabelKey(trail.theme))}
                          </p>
                          <h2 className="mt-1 text-lg font-extrabold">{trail.title}</h2>
                          {trail.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-white/75">{trail.description}</p>
                          )}
                        </div>
                        {completed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-bold uppercase text-emerald-100">
                            <Check className="h-3 w-3" /> {t("trails.completed")}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-amber-100/85">
                        <span className="inline-flex items-center gap-1.5">
                          <CofexIconTile meta={TRAIL_STAT_ICONS.stops} size="xs" />
                          {total} {t("trails.stops")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CofexIconTile meta={TRAIL_STAT_ICONS.distance} size="xs" />
                          {formatTrailDistance(trail.estimated_distance_m ?? 2500, i18n.language)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CofexIconTile meta={TRAIL_STAT_ICONS.duration} size="xs" />
                          {formatTrailDuration(trail.estimated_walk_minutes ?? 45, i18n.language)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CofexIconTile meta={TRAIL_STAT_ICONS.xp} size="xs" />
                          {trail.reward_points} XP
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      {trail.badge_slug && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--cofex-cream)] px-3 py-1 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">
                          <CofexIconTile meta={TRAIL_STAT_ICONS.badge} size="xs" />
                          {t("trails.badgeUnlock", { badge: trail.badge_slug.replace(/-/g, " ") })}
                        </div>
                      )}

                      {joined && !completed && (
                        <div>
                          <div className="mb-1 flex justify-between text-xs font-semibold text-[color:var(--cofex-black)]/60">
                            <span>{t("trails.progress", { done, total })}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                            <div
                              className="h-full bg-gradient-to-r from-[color:var(--cofex-cyan)] to-sky-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {!joined && (
                        <p className="text-sm font-semibold text-[color:var(--cofex-cyan)]">{t("trails.viewTrail")} →</p>
                      )}
                    </div>
                  </Link>
                );
              })
            )
          }
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}
