import { createFileRoute } from "@tanstack/react-router";
import { useAdminOverview, useAdminEngagement } from "@/lib/queries/admin";
import { Loader2, TrendingUp, MapPin, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const { data, isLoading } = useAdminOverview();
  const engagementQuery = useAdminEngagement();

  const engagement =
    data && data.users > 0 ? Math.round((data.checkIns / data.users) * 10) / 10 : 0;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Network analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">High-level engagement across CO:FE(X).</p>

      {isLoading || engagementQuery.isLoading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Avg check-ins / explorer" value={engagement} icon={TrendingUp} />
            <MetricCard
              label="Campaigns per approved café"
              value={data!.shops ? Math.round((data!.activeCampaigns / data!.shops) * 10) / 10 : 0}
            />
            <MetricCard label="Application backlog" value={data!.pendingApps} />
            <MetricCard label="Active campaign rate" value={`${data!.activeCampaigns} live`} />
          </div>

          {engagementQuery.data && (
            <section className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-semibold">Last 7 days</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MetricCard
                  label="Daily active explorers"
                  value={engagementQuery.data.daily_active_7d}
                  icon={Users}
                />
                <MetricCard label="Check-ins" value={engagementQuery.data.check_ins_7d} icon={TrendingUp} />
              </div>

              {engagementQuery.data.check_ins_by_city.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold inline-flex items-center gap-2 mb-3">
                    <MapPin className="h-4 w-4" /> Check-ins by city (30d)
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {engagementQuery.data.check_ins_by_city.map((row) => (
                      <li key={row.city} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                        <span>{row.city}</span>
                        <span className="font-medium tabular-nums">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon?: typeof TrendingUp;
}) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
      {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
      <p className="mt-3 text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
