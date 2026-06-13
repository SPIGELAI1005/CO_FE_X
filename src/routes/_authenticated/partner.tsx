import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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

const itemKeys = [
  { to: "/partner", labelKey: "partnerNav.dashboard", Icon: LayoutDashboard },
  { to: "/partner/shop", labelKey: "partnerNav.shop", Icon: Store },
  { to: "/partner/campaigns", labelKey: "partnerNav.campaigns", Icon: Megaphone },
  { to: "/partner/submissions", labelKey: "partnerNav.submissions", Icon: Share2 },
  { to: "/partner/verify", labelKey: "partnerNav.verify", Icon: Shield },
  { to: "/partner/rewards", labelKey: "partnerNav.rewards", Icon: Gift },
  { to: "/partner/analytics", labelKey: "partnerNav.analytics", Icon: BarChart3 },
  { to: "/partner/billing", labelKey: "partnerNav.billing", Icon: CreditCard },
  { to: "/partner/settings", labelKey: "partnerNav.settings", Icon: Settings },
] as const;

const footerItemKeys = [{ to: "/explore", labelKey: "partnerNav.backToExplorer", Icon: ArrowLeft }] as const;

function PartnerLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useMemo(
    () => itemKeys.map(({ labelKey, ...rest }) => ({ ...rest, label: t(labelKey) })),
    [t],
  );
  const footerItems = useMemo(
    () => footerItemKeys.map(({ labelKey, ...rest }) => ({ ...rest, label: t(labelKey) })),
    [t],
  );
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div
      className="flex min-h-screen flex-col cofex-app-chrome-pb md:pb-0"
      style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif" }}
    >
      <div className="flex min-h-0 flex-1">
        <SideNav title={t("partnerNav.title")} items={items} footerItems={footerItems} />
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
