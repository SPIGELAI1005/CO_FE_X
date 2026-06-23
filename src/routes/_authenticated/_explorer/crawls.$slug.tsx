import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Footprints,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage, AppPageBody } from "@/components/app/AppPageShell";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { Button } from "@/components/ui/button";
import { TrailMap } from "@/components/app/TrailMap";
import { useJoinTrail, useTrailDetail } from "@/lib/queries/vision";
import { useProfile } from "@/lib/queries/profile";
import { useUser } from "@/hooks/use-user";
import {
  formatTrailDistance,
  formatTrailDuration,
  trailProgressPct,
  trailThemeLabelKey,
} from "@/lib/trails";

export const Route = createFileRoute("/_authenticated/_explorer/crawls/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Trail · CO:FE(X)` }] }),
  component: TrailDetailPage,
});

function TrailDetailPage() {
  const { slug } = Route.useParams();
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const trailQuery = useTrailDetail(slug);
  const joinTrail = useJoinTrail();
  const { data: profile } = useProfile(user?.id);

  async function startTrail() {
    try {
      await joinTrail.mutateAsync(slug);
      toast.success(t("trails.started"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("trails.startFailed"));
    }
  }

  return (
    <AppPage>
      <AppPageBody className="mx-auto max-w-2xl space-y-4 pb-12 pt-4">
        <Link
          to="/crawls"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--cofex-cyan)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t("trails.backToList")}
        </Link>

        <QueryBoundary query={trailQuery} loadingLabel={t("trails.loading")}>
          {(trail) => {
            if (!trail) {
              return <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("trails.notFound")}</p>;
            }

            const done = trail.stops_done ?? 0;
            const total = trail.stop_count ?? trail.stops.length;
            const pct = trailProgressPct(done, total);

            return (
              <>
                <div className="cofex-app-card overflow-hidden">
                  <div className="bg-gradient-to-br from-[color:var(--cofex-coffee-deep)] via-[#3d2314] to-[color:var(--cofex-black)] p-6 text-white">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
                      {t(trailThemeLabelKey(trail.theme))}
                    </p>
                    <h1 className="mt-2 text-2xl font-extrabold">{trail.title}</h1>
                    {trail.description && <p className="mt-2 text-sm text-white/80">{trail.description}</p>}

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      <Stat icon={<MapPin className="h-4 w-4" />} label={t("trails.stops")} value={String(total)} />
                      <Stat
                        icon={<Footprints className="h-4 w-4" />}
                        label={t("trails.distance")}
                        value={formatTrailDistance(trail.estimated_distance_m ?? 2500, i18n.language)}
                      />
                      <Stat
                        icon={<Clock className="h-4 w-4" />}
                        label={t("trails.duration")}
                        value={formatTrailDuration(trail.estimated_walk_minutes ?? 45, i18n.language)}
                      />
                      <Stat
                        icon={<Sparkles className="h-4 w-4" />}
                        label={t("trails.reward")}
                        value={`${trail.reward_points} XP`}
                      />
                    </div>

                    {trail.badge_name && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm backdrop-blur">
                        <Award className="h-4 w-4 text-amber-300" />
                        {t("trails.badgeUnlockNamed", { badge: trail.badge_name })}
                      </div>
                    )}

                    {trail.seasonal && trail.ends_at && (
                      <p className="mt-3 text-xs text-amber-100/80">
                        {t("trails.seasonalUntil", {
                          date: new Date(trail.ends_at).toLocaleDateString(i18n.language),
                        })}
                      </p>
                    )}
                  </div>

                  <div className="p-4">
                    {trail.completed ? (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                        <Check className="h-5 w-5" /> {t("trails.completedCelebrate")}
                      </div>
                    ) : trail.joined ? (
                      <div>
                        <div className="mb-2 flex justify-between text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
                          <span>{t("trails.progress", { done, total })}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                          <div
                            className="h-full bg-gradient-to-r from-[color:var(--cofex-cyan)] to-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-[color:var(--cofex-black)]/55">{t("trails.progressHint")}</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        className="w-full rounded-full bg-[color:var(--cofex-coffee-deep)] py-6 text-base font-bold"
                        onClick={startTrail}
                        disabled={joinTrail.isPending}
                      >
                        {joinTrail.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t("trails.startTrail")}
                      </Button>
                    )}
                  </div>
                </div>

                <section>
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">
                    {t("trails.mapRoute")}
                  </h2>
                  <TrailMap
                    stops={trail.stops}
                    mapThemeId={profile?.map_theme}
                    className="h-64 w-full overflow-hidden rounded-2xl border border-[color:var(--border)]"
                  />
                </section>

                <section className="space-y-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">
                    {t("trails.stopsTitle")}
                  </h2>
                  <ol className="space-y-2">
                    {trail.stops.map((stop) => (
                      <li
                        key={`${stop.order}-${stop.shop_id}`}
                        className={`cofex-app-card flex items-center gap-3 p-4 ${stop.done ? "ring-2 ring-emerald-300/60" : ""}`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            stop.done
                              ? "bg-emerald-500 text-white"
                              : "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-coffee-deep)]"
                          }`}
                        >
                          {stop.done ? <Check className="h-4 w-4" /> : stop.order}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/coffee/$slug"
                            params={{ slug: stop.shop_slug }}
                            className="font-semibold text-[color:var(--cofex-coffee-deep)] hover:underline"
                          >
                            {stop.shop_name}
                          </Link>
                          {stop.campaign_title && (
                            <p className="text-xs text-[color:var(--cofex-cyan)]">
                              {t("trails.campaignAtStop")}: {stop.campaign_title}
                            </p>
                          )}
                          {stop.hint && <p className="text-xs text-[color:var(--cofex-black)]/55">{stop.hint}</p>}
                        </div>
                        {stop.campaign_id && (
                          <Link
                            to="/campaign/$id"
                            params={{ id: stop.campaign_id }}
                            className="shrink-0 rounded-full bg-[color:var(--cofex-pastel-blue)] px-3 py-1 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]"
                          >
                            {t("trails.openCampaign")}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            );
          }}
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-1 text-amber-200/80">{icon}<span className="text-[10px] uppercase">{label}</span></div>
      <div className="mt-1 text-sm font-bold">{value}</div>
    </div>
  );
}
