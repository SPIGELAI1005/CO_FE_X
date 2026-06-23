import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useAdminPartnerApplications,
  useReviewPartnerApplication,
  useAdminPendingShops,
  useAdminSetShopStatus,
} from "@/lib/queries/admin";
import { AdminCard, AdminPage, AdminStatusBadge } from "@/components/app/admin/AdminShell";
import { Button } from "@/components/ui/button";
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
    <AdminPage
      title="Partner approval"
      subtitle="Review partner applications and cafés awaiting verification."
      action={
        <Link
          to="/admin/shops"
          className="text-sm font-semibold text-[color:var(--cofex-cyan)] hover:underline"
        >
          All cafés →
        </Link>
      }
    >
      <section>
        <h2 className="text-lg font-bold text-[color:var(--cofex-coffee-deep)]">Applications</h2>
        {isLoading ? (
          <Loader2 className="mt-6 h-6 w-6 animate-spin text-muted-foreground" />
        ) : !applications?.length ? (
          <p className="mt-4 text-sm text-[color:var(--cofex-black)]/60">No applications yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {applications.map((app) => (
              <li key={app.id}>
                <AdminCard>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{app.business_name}</p>
                      <p className="text-sm text-[color:var(--cofex-black)]/60">{app.contact_email}</p>
                      {app.city && <p className="text-xs text-[color:var(--cofex-black)]/50">{app.city}</p>}
                      {app.message && <p className="mt-2 text-sm">{app.message}</p>}
                    </div>
                    <AdminStatusBadge status={app.status} />
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
                </AdminCard>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[color:var(--cofex-coffee-deep)]">Pending & suspended cafés</h2>
        {!shops?.length ? (
          <p className="mt-4 text-sm text-[color:var(--cofex-black)]/60">No shops awaiting review.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shops.map((shop) => (
              <li key={shop.id}>
                <AdminCard className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{shop.name}</p>
                    <p className="text-sm text-[color:var(--cofex-black)]/60">
                      {shop.city ?? "—"} · {shop.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminStatusBadge status={shop.status} />
                    {shop.status !== "approved" && (
                      <Button size="sm" onClick={() => shopStatus(shop.id, "approved")}>
                        Approve
                      </Button>
                    )}
                    {shop.status === "pending" && (
                      <Button size="sm" variant="destructive" onClick={() => shopStatus(shop.id, "rejected")}>
                        Reject
                      </Button>
                    )}
                    {shop.status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => shopStatus(shop.id, "suspended")}>
                        Suspend
                      </Button>
                    )}
                    {shop.status === "suspended" && (
                      <Button size="sm" variant="outline" onClick={() => shopStatus(shop.id, "approved")}>
                        Reinstate
                      </Button>
                    )}
                  </div>
                </AdminCard>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPage>
  );
}
