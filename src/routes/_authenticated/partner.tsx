import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, Store, Megaphone, Gift, BarChart3, Shield } from "lucide-react";
import { SideNav } from "@/components/app/SideNav";
import { NotificationsBell } from "@/components/app/NotificationsBell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/partner")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isPartner = (roles ?? []).some((r: { role: string }) => r.role === "partner");
    if (!isPartner) throw redirect({ to: "/profile" });
  },
  component: PartnerLayout,
});

const items = [
  { to: "/partner", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/partner/shop", label: "Shop profile", Icon: Store },
  { to: "/partner/campaigns", label: "Campaigns", Icon: Megaphone },
  { to: "/partner/verify", label: "Verify code", Icon: Shield },
  { to: "/partner/rewards", label: "Rewards", Icon: Gift },
  { to: "/partner/analytics", label: "Analytics", Icon: BarChart3 },
];

function PartnerLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <SideNav title="Partner" items={items} />
      <div className="flex-1 flex flex-col">
        <header
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Link to="/partner" className="text-xs font-bold tracking-[0.3em]" style={{ color: "var(--cofex-coffee-deep)" }}>
            CO:FE(X) · Partner
          </Link>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
