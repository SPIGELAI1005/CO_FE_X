import { createFileRoute, Outlet, redirect, useNavigate, Link } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, Store, Megaphone, Users, BarChart3, DollarSign, ShieldAlert, Coffee, Image, ArrowLeft } from "lucide-react";
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

const footerItems = [{ to: "/radar", label: "Back to app", Icon: ArrowLeft }];

function AdminLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}>
      <SideNav title="Admin" items={items} footerItems={footerItems} />
      <div className="flex-1 flex flex-col">
        <header
          className="flex items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <Link to="/admin" className="text-xs font-bold tracking-[0.3em] shrink-0">
            CO:FE(X) · Admin
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/radar"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--cofex-cream)] px-3 py-1.5 text-xs font-semibold text-[color:var(--cofex-coffee-deep)] transition hover:bg-[color:var(--cofex-pastel-blue)]/40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Back to app</span>
              <span className="sm:hidden">App</span>
            </Link>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0">
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
