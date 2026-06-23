import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAdminSetCampaignStatus } from "@/lib/queries/admin";
import { useAdminCampaignMetrics } from "@/lib/queries/admin-moderation";
import { AdminCard, AdminLoading, AdminPage, AdminStatusBadge } from "@/components/app/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Gift, CheckCircle2, Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns · Admin" }] }),
  component: AdminCampaignsPage,
});

const FILTERS = ["all", "active", "paused", "rejected", "ended"] as const;

function AdminCampaignsPage() {
  const { data: campaigns, isLoading } = useAdminCampaignMetrics();
  const setStatus = useAdminSetCampaignStatus();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    const list = campaigns ?? [];
    if (filter === "all") return list;
    return list.filter((c) => c.status === filter);
  }, [campaigns, filter]);

  async function updateStatus(campaignId: string, status: string) {
    try {
      await setStatus.mutateAsync({ campaignId, status });
      toast.success(`Campaign ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <AdminPage
      title="Campaign management"
      subtitle="View active campaigns, pause violating ones, and review participation metrics."
      action={
        <Select value={filter} onValueChange={(v) => setFilter(v as (typeof FILTERS)[number])}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f} className="capitalize">
                {f === "all" ? "All statuses" : f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <AdminLoading />
      ) : !filtered.length ? (
        <AdminCard className="text-sm text-[color:var(--cofex-black)]/60">No campaigns match this filter.</AdminCard>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <AdminCard>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[color:var(--cofex-coffee-deep)]">{c.title}</p>
                      <AdminStatusBadge status={c.status} />
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60">
                      {c.shop_name} · {c.shop_city ?? "—"} · {c.reward_type} · +{c.points_reward} pts
                    </p>
                    {(c.starts_at || c.ends_at) && (
                      <p className="mt-0.5 text-xs text-[color:var(--cofex-black)]/45">
                        {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : "—"} →{" "}
                        {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "—"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric icon={Users} label="Participants" value={c.participants} />
                  <Metric icon={Gift} label="Redemptions" value={c.redemptions} />
                  <Metric icon={CheckCircle2} label="Used rewards" value={c.used_rewards} />
                  <Metric icon={Megaphone} label="Approved proofs" value={c.approved_proofs} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {c.status !== "active" && (
                    <Button size="sm" onClick={() => updateStatus(c.id, "active")} disabled={setStatus.isPending}>
                      Activate
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "paused")} disabled={setStatus.isPending}>
                      Pause
                    </Button>
                  )}
                  {c.status !== "rejected" && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(c.id, "rejected")} disabled={setStatus.isPending}>
                      Remove (reject)
                    </Button>
                  )}
                  {c.status !== "ended" && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "ended")} disabled={setStatus.isPending}>
                      End
                    </Button>
                  )}
                </div>
              </AdminCard>
            </li>
          ))}
        </ul>
      )}
    </AdminPage>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[color:var(--cofex-cream)] px-3 py-2">
      <Icon className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-black)]/45">{label}</p>
        <p className="text-sm font-extrabold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
