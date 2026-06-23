import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, Store, Megaphone, Users, BarChart3, DollarSign, ShieldAlert, Coffee, Image } from "lucide-react";
import { SideNav } from "@/components/app/SideNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) throw redirect({ to: "/profile" });
  },
  component: AdminLayout,
});

const items = [
  { to: "/admin", label: "Overview", Icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", Icon: Users },
  { to: "/admin/shops", label: "Cafés", Icon: Coffee },
  { to: "/admin/partners", label: "Partners", Icon: Store },
  { to: "/admin/campaigns", label: "Campaigns", Icon: Megaphone },
  { to: "/admin/trust", label: "Trust & fraud", Icon: ShieldAlert },
  { to: "/admin/moderation", label: "Moderation", Icon: Image },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/admin/revenue", label: "Revenue", Icon: DollarSign },
];

function AdminLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <SideNav title="Admin" items={items} />
      <div className="flex-1 flex flex-col">
        <header
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Link to="/admin" className="text-xs font-bold tracking-[0.3em]">
            CO:FE(X) · Admin
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
