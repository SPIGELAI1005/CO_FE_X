import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Check } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useUser } from "@/hooks/use-user";
import { useCoffeeCrawls, useCrawlProgress } from "@/lib/queries/vision";

export const Route = createFileRoute("/_authenticated/_explorer/crawls")({
  head: () => ({ meta: [{ title: "Coffee crawls · CO:FE(X)" }] }),
  component: CrawlsPage,
});

function CrawlsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const crawlsQuery = useCoffeeCrawls();
  const progressQuery = useCrawlProgress(user?.id);

  const progressMap = new Map((progressQuery.data ?? []).map((p) => [p.crawl_id, p]));

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("crawls.eyebrow")}
        title={t("crawls.title")}
        subtitle={t("crawls.subtitle")}
      />
      <AppPageBody className="mx-auto max-w-2xl space-y-6 pb-10">
        <QueryBoundary query={crawlsQuery} loadingLabel={t("crawls.loading")}>
          {(crawls) =>
            crawls.length === 0 ? (
              <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("crawls.empty")}</p>
            ) : (
              crawls.map((crawl) => {
                const prog = progressMap.get(crawl.id);
                return (
                  <AppPageSection key={crawl.id} title={crawl.title} subtitle={crawl.description ?? undefined}>
                    <div className="mb-2 flex items-center justify-between text-xs text-[color:var(--cofex-black)]/55">
                      <span>{crawl.city_slug}</span>
                      <span>{crawl.reward_points} pts reward</span>
                    </div>
                    {prog ? (
                      <div className="mb-3 text-sm font-semibold text-[color:var(--cofex-cyan)]">
                        {prog.completed
                          ? t("crawls.completed")
                          : t("crawls.progress", { done: prog.stops_done, total: prog.stop_count })}
                      </div>
                    ) : null}
                    <ol className="space-y-2">
                      {crawl.stops.map((stop) => (
                        <li key={stop.shop_id} className="cofex-app-card flex items-center gap-3 p-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--cofex-cream)] text-sm font-bold">
                            {stop.order}
                          </span>
                          <div className="min-w-0 flex-1">
                            <Link
                              to="/coffee/$slug"
                              params={{ slug: stop.shop_slug }}
                              className="font-semibold text-[color:var(--cofex-coffee-deep)] hover:underline"
                            >
                              {stop.shop_name}
                            </Link>
                            {stop.hint ? (
                              <p className="text-xs text-[color:var(--cofex-black)]/55">{stop.hint}</p>
                            ) : null}
                          </div>
                          <MapPin className="h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
                        </li>
                      ))}
                    </ol>
                    {prog?.completed ? (
                      <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                        <Check className="h-4 w-4" /> {t("crawls.completed")}
                      </div>
                    ) : null}
                  </AppPageSection>
                );
              })
            )
          }
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}
