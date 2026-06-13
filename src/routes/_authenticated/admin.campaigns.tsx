import { createFileRoute } from "@tanstack/react-router";
import { useAdminCampaigns, useAdminSetCampaignStatus } from "@/lib/queries/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Admin" }] }),
  component: AdminCampaignsPage,
});

function AdminCampaignsPage() {
  const { data: campaigns, isLoading } = useAdminCampaigns();
  const setStatus = useAdminSetCampaignStatus();

  async function updateStatus(campaignId: string, status: string) {
    try {
      await setStatus.mutateAsync({ campaignId, status });
      toast.success(`Campaign ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Campaign moderation</h1>
      <p className="mt-1 text-sm text-muted-foreground">Approve, pause, or reject campaigns.</p>

      {isLoading ? (
        <Loader2 className="mt-8 h-6 w-6 animate-spin text-muted-foreground" />
      ) : !campaigns?.length ? (
        <p className="mt-8 text-sm text-muted-foreground">No campaigns found.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {campaigns.map((c) => {
            const shop = c.coffee_shops as { name: string; city: string | null } | null;
            return (
              <li
                key={c.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {shop?.name ?? "—"} · {shop?.city ?? "—"}
                    </p>
                  </div>
                  <Badge className="capitalize">{c.status}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.status !== "active" && (
                    <Button size="sm" onClick={() => updateStatus(c.id, "active")}>
                      Activate
                    </Button>
                  )}
                  {c.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "paused")}>
                      Pause
                    </Button>
                  )}
                  {c.status !== "rejected" && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(c.id, "rejected")}>
                      Reject
                    </Button>
                  )}
                  {c.status !== "ended" && (
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(c.id, "ended")}>
                      End
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
