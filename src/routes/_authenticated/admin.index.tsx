import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminOverview } from "@/lib/queries/admin";
import { Users, Store, Megaphone, Coffee, ClipboardList, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — CO:FE(X)" }] }),
  component: AdminOverviewPage,
});

const STAT_CARDS = [
  { key: "users" as const, label: "Explorers", icon: Users },
  { key: "shops" as const, label: "Approved cafés", icon: Store },
  { key: "pendingApps" as const, label: "Pending applications", icon: ClipboardList },
  { key: "activeCampaigns" as const, label: "Active campaigns", icon: Megaphone },
  { key: "checkIns" as const, label: "Total check-ins", icon: Coffee },
];

function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Admin console</h1>
      <p className="mt-1 text-sm text-muted-foreground">Network health and moderation queues.</p>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAT_CARDS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-2xl border p-5"
              style={{ borderColor: "var(--border)" }}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <p className="mt-3 text-3xl font-bold tabular-nums">{data?.[key] ?? 0}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/partners"
          className="rounded-2xl border p-5 hover:bg-accent/50 transition"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="font-semibold">Review partner applications</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.pendingApps ?? 0} waiting
          </p>
        </Link>
        <Link
          to="/admin/campaigns"
          className="rounded-2xl border p-5 hover:bg-accent/50 transition"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="font-semibold">Moderate campaigns</p>
          <p className="mt-1 text-sm text-muted-foreground">Pause or reject running campaigns</p>
        </Link>
      </div>
    </div>
  );
}
