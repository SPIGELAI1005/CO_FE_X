import { lazy, Suspense } from "react";
import type { CampaignBar, DailyPoint } from "./PartnerDashboardChartsInner";

const Charts = lazy(() =>
  import("./PartnerDashboardChartsInner").then((m) => ({ default: m.PartnerDashboardChartsInner })),
);

export function PartnerDashboardCharts({
  series,
  campaignBars,
}: {
  series: DailyPoint[];
  campaignBars: CampaignBar[];
}) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2 h-64 rounded-2xl border bg-white animate-pulse" />
          <div className="h-64 rounded-2xl border bg-white animate-pulse" />
        </div>
      }
    >
      <Charts series={series} campaignBars={campaignBars} />
    </Suspense>
  );
}

export type { DailyPoint, CampaignBar };
