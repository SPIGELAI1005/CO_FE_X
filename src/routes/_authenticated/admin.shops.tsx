import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAdminShops, useAdminSetShopStatus } from "@/lib/queries/admin";
import { AdminCard, AdminLoading, AdminPage, AdminStatusBadge } from "@/components/app/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/shops")({
  head: () => ({ meta: [{ title: "Cafés · Admin" }] }),
  component: AdminShopsPage,
});

const STATUSES = ["all", "approved", "pending", "suspended", "rejected"] as const;

function AdminShopsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const { data: shops, isLoading } = useAdminShops(status, query);
  const setShopStatus = useAdminSetShopStatus();

  async function updateStatus(shopId: string, next: string) {
    try {
      await setShopStatus.mutateAsync({ shopId, status: next });
      toast.success(`Café marked ${next}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <AdminPage
      title="Café management"
      subtitle="Verify listings, review profiles, approve or suspend cafés across the network."
    >
      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--cofex-black)]/40" />
          <Input
            className="pl-9"
            placeholder="Search by name, city, or slug"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <AdminLoading />
      ) : !shops?.length ? (
        <AdminCard className="text-sm text-[color:var(--cofex-black)]/60">No cafés match your filters.</AdminCard>
      ) : (
        <ul className="space-y-3">
          {shops.map((shop) => (
            <li key={shop.id}>
              <AdminCard className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[color:var(--cofex-coffee-deep)]">{shop.name}</p>
                    <AdminStatusBadge status={shop.status} />
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60">
                    {shop.city ?? "-"} · {shop.slug}
                  </p>
                  {shop.address && <p className="mt-0.5 text-xs text-[color:var(--cofex-black)]/50">{shop.address}</p>}
                  <p className="mt-2 text-xs text-[color:var(--cofex-black)]/45">
                    Partner {shop.partner_id?.slice(0, 8) ?? "-"} · Added{" "}
                    {new Date(shop.created_at).toLocaleDateString()}
                    {shop.rating != null && ` · ★ ${Number(shop.rating).toFixed(1)} (${shop.rating_count})`}
                  </p>
                  <Link
                    to="/coffee/$slug"
                    params={{ slug: shop.slug }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline"
                  >
                    View public profile <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {shop.status !== "approved" && (
                    <Button size="sm" onClick={() => updateStatus(shop.id, "approved")} disabled={setShopStatus.isPending}>
                      Approve
                    </Button>
                  )}
                  {shop.status !== "suspended" && shop.status === "approved" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(shop.id, "suspended")} disabled={setShopStatus.isPending}>
                      Suspend
                    </Button>
                  )}
                  {shop.status === "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(shop.id, "approved")} disabled={setShopStatus.isPending}>
                      Reinstate
                    </Button>
                  )}
                  {shop.status !== "rejected" && shop.status !== "approved" && (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(shop.id, "rejected")} disabled={setShopStatus.isPending}>
                      Reject
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
