import { createFileRoute } from "@tanstack/react-router";
import {
  useAdminPartnerApplications,
  useReviewPartnerApplication,
  useAdminPendingShops,
  useAdminSetShopStatus,
} from "@/lib/queries/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  head: () => ({ meta: [{ title: "Partners · Admin" }] }),
  component: AdminPartnersPage,
});

function AdminPartnersPage() {
  const { data: applications, isLoading } = useAdminPartnerApplications();
  const { data: shops } = useAdminPendingShops();
  const review = useReviewPartnerApplication();
  const setShopStatus = useAdminSetShopStatus();

  async function decide(id: string, decision: "approved" | "rejected") {
    try {
      await review.mutateAsync({ id, decision });
      toast.success(decision === "approved" ? "Partner approved" : "Application rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function shopStatus(shopId: string, status: string) {
    try {
      await setShopStatus.mutateAsync({ shopId, status });
      toast.success(`Shop marked ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Partner approval</h1>
      <p className="mt-1 text-sm text-muted-foreground">Review applications and pending café listings.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Applications</h2>
        {isLoading ? (
          <Loader2 className="mt-6 h-6 w-6 animate-spin text-muted-foreground" />
        ) : !applications?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {applications.map((app) => (
              <li
                key={app.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{app.business_name}</p>
                    <p className="text-sm text-muted-foreground">{app.contact_email}</p>
                    {app.city && <p className="text-xs text-muted-foreground">{app.city}</p>}
                    {app.message && <p className="mt-2 text-sm">{app.message}</p>}
                  </div>
                  <Badge variant={app.status === "pending" ? "secondary" : "outline"} className="capitalize">
                    {app.status}
                  </Badge>
                </div>
                {app.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => decide(app.id, "approved")} disabled={review.isPending}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => decide(app.id, "rejected")} disabled={review.isPending}>
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Pending cafés</h2>
        {!shops?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">No shops awaiting review.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shops.map((shop) => (
              <li
                key={shop.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <p className="font-semibold">{shop.name}</p>
                  <p className="text-sm text-muted-foreground">{shop.city ?? "-"} · {shop.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize">{shop.status}</Badge>
                  {shop.status !== "approved" && (
                    <Button size="sm" onClick={() => shopStatus(shop.id, "approved")}>
                      Approve
                    </Button>
                  )}
                  {shop.status !== "rejected" && (
                    <Button size="sm" variant="outline" onClick={() => shopStatus(shop.id, "rejected")}>
                      Reject
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
