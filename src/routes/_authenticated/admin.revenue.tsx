import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAdminOverview } from "@/lib/queries/admin";
import { getStripeRevenueMetrics } from "@/lib/api/stripe.billing";
import { DollarSign, Loader2, TrendingUp, Users, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue — Admin" }] }),
  component: AdminRevenuePage,
});

function formatEur(cents: number) {
  return new Intl.NumberFormat("en-EU", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function AdminRevenuePage() {
  const { data: overview, isLoading: overviewLoading } = useAdminOverview();
  const revenueQuery = useQuery({
    queryKey: ["adminRevenue"],
    queryFn: () => getStripeRevenueMetrics(),
    retry: false,
  });

  const metrics = revenueQuery.data;
  const loading = overviewLoading || revenueQuery.isLoading;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Revenue</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Subscription MRR and partner plan mix. Stripe metrics load server-side — keys never reach the browser.
      </p>

      {loading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="mt-8 space-y-6">
          {revenueQuery.isError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              Could not load Stripe metrics. Database totals below may still be available.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="MRR"
              value={metrics ? formatEur(metrics.mrrCents) : "—"}
              hint={metrics?.stripeEnabled ? "From Stripe" : "Estimated from plans"}
              Icon={DollarSign}
            />
            <MetricCard
              label="Paid subscriptions"
              value={String(metrics?.activeSubscriptions ?? 0)}
              hint={`${metrics?.trialing ?? 0} trialing`}
              Icon={TrendingUp}
            />
            <MetricCard
              label="Past due"
              value={String(metrics?.pastDue ?? 0)}
              hint={`${metrics?.churnLast30 ?? 0} canceled (30d)`}
              Icon={AlertCircle}
            />
            <MetricCard
              label="Approved cafés"
              value={String(overview?.shops ?? 0)}
              hint={`${overview?.activeCampaigns ?? 0} active campaigns`}
              Icon={Users}
            />
          </div>

          {metrics && (
            <div
              className="rounded-2xl border p-6"
              style={{ borderColor: "var(--border)", background: "var(--cofex-cream-warm)" }}
            >
              <h2 className="font-semibold">Plan mix (active + trialing)</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
                <li>
                  <strong>{metrics.byPlan.listing}</strong> free listings
                </li>
                <li>
                  <strong>{metrics.byPlan.campaign_boost}</strong> campaign boost
                </li>
                <li>
                  <strong>{metrics.byPlan.pro}</strong> pro
                </li>
              </ul>
              {!metrics.stripeEnabled && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET for live MRR from Stripe.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-semibold">Network scale</h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <strong>{overview?.users ?? 0}</strong> registered explorers
              </li>
              <li>
                <strong>{overview?.checkIns ?? 0}</strong> total check-ins
              </li>
              <li>
                <strong>{overview?.pendingApps ?? 0}</strong> partner applications pending review
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
