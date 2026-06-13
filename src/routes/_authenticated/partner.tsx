import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  LayoutDashboard,
  Store,
  Megaphone,
  Gift,
  BarChart3,
  Shield,
  Share2,
  CreditCard,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { SideNav } from "@/components/app/SideNav";
import { PartnerHeader } from "@/components/app/PartnerHeader";
import { PartnerBottomNav } from "@/components/app/PartnerBottomNav";
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
  { to: "/partner/submissions", label: "Submissions", Icon: Share2 },
  { to: "/partner/verify", label: "Verify code", Icon: Shield },
  { to: "/partner/rewards", label: "Rewards", Icon: Gift },
  { to: "/partner/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/partner/billing", label: "Billing", Icon: CreditCard },
  { to: "/partner/settings", label: "Settings", Icon: Settings },
];

const footerItems = [{ to: "/explore", label: "Back to Explorer", Icon: ArrowLeft }];

function PartnerLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div
      className="flex min-h-screen flex-col pb-20 md:pb-0"
      style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}
    >
      <div className="flex min-h-0 flex-1">
        <SideNav title="Partner" items={items} footerItems={footerItems} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PartnerHeader onSignOut={signOut} />
          <main className="flex min-h-0 flex-1 flex-col">
            <Outlet />
          </main>
        </div>
      </div>
      <PartnerBottomNav />
    </div>
  );
}
