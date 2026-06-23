import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminOverview } from "@/lib/queries/admin";
import { AdminLoading, AdminStatGrid } from "@/components/app/admin/AdminShell";
import {
  Users,
  Store,
  Megaphone,
  Coffee,
  ClipboardList,
  ShieldAlert,
  Image,
  UserCog,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin · CO:FE(X)" }] }),
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-extrabold text-[color:var(--cofex-coffee-deep)]">Admin console</h1>
      <p className="mt-1 text-sm text-[color:var(--cofex-black)]/65">
        Platform control — users, cafés, campaigns, trust & safety, and content moderation.
      </p>

      {isLoading ? (
        <AdminLoading />
      ) : (
        <>
          <div className="mt-8">
            <AdminStatGrid
              stats={[
                { label: "Explorers", icon: Users, value: data?.users ?? 0 },
                { label: "Approved cafés", icon: Store, value: data?.shops ?? 0 },
                { label: "Partner applications", icon: ClipboardList, value: data?.pendingApps ?? 0 },
                { label: "Cafés pending review", icon: Coffee, value: data?.pendingShops ?? 0 },
                { label: "Active campaigns", icon: Megaphone, value: data?.activeCampaigns ?? 0 },
                { label: "Total check-ins", icon: Coffee, value: data?.checkIns ?? 0 },
              ]}
            />
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <QuickLink
              to="/admin/users"
              title="User management"
              description="Search users, roles, trust status, activity"
              icon={UserCog}
              badge={undefined}
            />
            <QuickLink
              to="/admin/shops"
              title="Café management"
              description="Verify, approve, suspend cafés"
              icon={Coffee}
              badge={data?.pendingShops ? `${data.pendingShops} pending` : undefined}
            />
            <QuickLink
              to="/admin/partners"
              title="Partner applications"
              description="Review new partner sign-ups"
              icon={Store}
              badge={data?.pendingApps ? `${data.pendingApps} waiting` : undefined}
            />
            <QuickLink
              to="/admin/campaigns"
              title="Campaign moderation"
              description="Pause or remove violating campaigns"
              icon={Megaphone}
            />
            <QuickLink
              to="/admin/trust"
              title="Trust & fraud"
              description="Suspicious users, duplicate scans, café reports"
              icon={ShieldAlert}
            />
            <QuickLink
              to="/admin/moderation"
              title="Content moderation"
              description="Review moments, feed items, abuse reports"
              icon={Image}
              badge={data?.openReports ? `${data.openReports} reports` : undefined}
            />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({
  to,
  title,
  description,
  icon: Icon,
  badge,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}) {
  return (
    <Link to={to} className="cofex-app-card block p-5 transition hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <Icon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
        {badge && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">{badge}</span>
        )}
      </div>
      <p className="mt-3 font-bold text-[color:var(--cofex-coffee-deep)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--cofex-black)]/60">{description}</p>
    </Link>
  );
}
