import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Eye,
  UserPlus,
  Share2,
  Star,
  Gift,
  Megaphone,
  Store,
  Camera,
  Shield,
  BarChart3,
} from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { PartnerDashboardCharts } from "@/components/app/PartnerDashboardCharts";
import { Button } from "@/components/ui/button";
import { usePartnerArrivals } from "@/lib/queries/vision";
import { Navigation } from "lucide-react";
import {
  PARTNER_BTN,
  PartnerEmptyState,
  PartnerKpiCard,
  PartnerLoadingGrid,
  PartnerWorkflowStep,
  formatCompact,
  partnerDelta,
} from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({ meta: [{ title: "Partner dashboard · CO:FE(X)" }] }),
  component: PartnerDashboard,
});

type Daily = { day: string; visitors: number; new_customers: number; redemptions: number; reviews: number };

function startOfDayISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function lastNDays(n: number) {
  const days: { key: string; label: string }[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  return days;
}

function PartnerDashboard() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState<string>("");
  const [shopCount, setShopCount] = useState(0);
  const [kpis, setKpis] = useState({
    visitors: 0,
    participants: 0,
    new_customers: 0,
    social_reach: 0,
    reviews: 0,
    redemptions: 0,
    visitorsPrev: 0,
    participantsPrev: 0,
  });
  const [series, setSeries] = useState<Daily[]>([]);
  const [campaignBars, setCampaignBars] = useState<{ name: string; participants: number; redemptions: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; kind: string; text: string; at: string }[]>([]);
  const arrivalsQuery = usePartnerArrivals();

  const days = useMemo(() => lastNDays(30), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: shops } = await supabase.from("coffee_shops").select("id, name").eq("partner_id", user.id);
      const shopIds = (shops ?? []).map((s) => s.id);
      setShopCount(shopIds.length);
      setShopName(shops?.[0]?.name ?? t("partnerDashboardPage.yourCafe"));
      if (!shopIds.length) {
        setLoading(false);
        return;
      }

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const prevMonthStart = new Date(monthStart);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const monthStartISO = monthStart.toISOString();
      const prevMonthStartISO = prevMonthStart.toISOString();
      const since30 = startOfDayISO(new Date(Date.now() - 29 * 86400000));

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title")
        .in("coffee_shop_id", shopIds);
      const cIds = (campaigns ?? []).map((c) => c.id);
      const cTitle = new Map<string, string>((campaigns ?? []).map((c) => [c.id, c.title]));

      const [
        { data: cinsMonth },
        { data: cinsPrev },
        { data: cinsSeries },
        { data: revMonth },
        { data: revSeries },
        { data: redMonth },
        { data: redSeries },
        { data: partsMonth },
        { data: partsPrev },
        { data: socialApproved },
        { count: socialMonth },
      ] = await Promise.all([
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", monthStartISO),
        supabase
          .from("check_ins")
          .select("user_id, created_at")
          .in("coffee_shop_id", shopIds)
          .gte("created_at", prevMonthStartISO)
          .lt("created_at", monthStartISO),
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", since30),
        supabase.from("reviews").select("id, created_at").in("coffee_shop_id", shopIds).gte("created_at", monthStartISO),
        supabase.from("reviews").select("id, created_at").in("coffee_shop_id", shopIds).gte("created_at", since30),
        cIds.length
          ? supabase
              .from("campaign_redemptions")
              .select("id, redeemed_at, used_at, campaign_id")
              .in("campaign_id", cIds)
              .gte("redeemed_at", monthStartISO)
          : Promise.resolve({ data: [] as { id: string; redeemed_at: string; used_at: string | null; campaign_id: string }[] }),
        cIds.length
          ? supabase
              .from("campaign_redemptions")
              .select("id, redeemed_at, campaign_id")
              .in("campaign_id", cIds)
              .gte("redeemed_at", since30)
          : Promise.resolve({ data: [] as { id: string; redeemed_at: string; campaign_id: string }[] }),
        cIds.length
          ? supabase
              .from("campaign_participants")
              .select("user_id, joined_at, campaign_id")
              .in("campaign_id", cIds)
              .gte("joined_at", monthStartISO)
          : Promise.resolve({ data: [] as { user_id: string; joined_at: string; campaign_id: string }[] }),
        cIds.length
          ? supabase
              .from("campaign_participants")
              .select("user_id, joined_at, campaign_id")
              .in("campaign_id", cIds)
              .gte("joined_at", prevMonthStartISO)
              .lt("joined_at", monthStartISO)
          : Promise.resolve({ data: [] as { user_id: string; joined_at: string; campaign_id: string }[] }),
        cIds.length
          ? supabase
              .from("social_submissions")
              .select("platform, created_at, campaign_id")
              .in("campaign_id", cIds)
              .eq("status", "approved")
              .gte("created_at", monthStartISO)
          : Promise.resolve({ data: [] as { platform: string; created_at: string; campaign_id: string }[] }),
        cIds.length
          ? supabase
              .from("social_submissions")
              .select("*", { count: "exact", head: true })
              .in("campaign_id", cIds)
              .eq("status", "approved")
              .gte("created_at", monthStartISO)
          : Promise.resolve({ count: 0 }),
      ]);

      const userFirsts = new Map<string, string>();
      const allHistory = await supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds);
      for (const r of allHistory.data ?? []) {
        const prev = userFirsts.get(r.user_id);
        if (!prev || r.created_at < prev) userFirsts.set(r.user_id, r.created_at);
      }
      let newCustomers = 0;
      for (const [, first] of userFirsts) if (first >= monthStartISO) newCustomers += 1;

      const REACH_PER_POST: Record<string, number> = {
        instagram_post: 600,
        instagram_story: 350,
        tiktok: 1200,
        facebook: 400,
        screenshot: 200,
      };
      const socialReach = (socialApproved ?? []).reduce(
        (s, r) => s + (REACH_PER_POST[r.platform] ?? 300),
        0,
      );

      const dayMap = new Map<string, Daily>();
      for (const d of days) dayMap.set(d.key, { day: d.label, visitors: 0, new_customers: 0, redemptions: 0, reviews: 0 });
      for (const r of cinsSeries ?? []) {
        const k = r.created_at.slice(0, 10);
        const row = dayMap.get(k);
        if (row) row.visitors += 1;
      }
      for (const r of revSeries ?? []) {
        const k = r.created_at.slice(0, 10);
        const row = dayMap.get(k);
        if (row) row.reviews += 1;
      }
      for (const r of redSeries ?? []) {
        const k = (r.redeemed_at ?? "").slice(0, 10);
        const row = dayMap.get(k);
        if (row) row.redemptions += 1;
      }
      for (const [, first] of userFirsts) {
        const k = first.slice(0, 10);
        const row = dayMap.get(k);
        if (row) row.new_customers += 1;
      }

      const partsByC = new Map<string, number>();
      const redsByC = new Map<string, number>();
      for (const p of partsMonth ?? []) partsByC.set(p.campaign_id, (partsByC.get(p.campaign_id) ?? 0) + 1);
      for (const r of redMonth ?? []) redsByC.set(r.campaign_id, (redsByC.get(r.campaign_id) ?? 0) + 1);
      const bars = (campaigns ?? [])
        .map((c) => ({
          name: (cTitle.get(c.id) ?? "").slice(0, 18),
          participants: partsByC.get(c.id) ?? 0,
          redemptions: redsByC.get(c.id) ?? 0,
        }))
        .sort((a, b) => b.participants + b.redemptions - (a.participants + a.redemptions))
        .slice(0, 6);
      setCampaignBars(bars);

      const feed: { id: string; kind: string; text: string; at: string }[] = [];
      for (const r of (cinsSeries ?? []).slice(-5))
        feed.push({ id: "ci-" + r.created_at, kind: "visit", text: t("partnerDashboardPage.checkedIn"), at: r.created_at });
      for (const r of (redSeries ?? []).slice(-5))
        feed.push({
          id: "rd-" + r.id,
          kind: "redeem",
          text: t("partnerDashboardPage.rewardRedeemed", { name: cTitle.get(r.campaign_id) ?? t("partnerDashboardPage.campaignFallback") }),
          at: r.redeemed_at,
        });
      for (const r of (revSeries ?? []).slice(-5))
        feed.push({ id: "rv-" + r.id, kind: "review", text: t("partnerDashboardPage.newReview"), at: r.created_at });
      feed.sort((a, b) => (a.at < b.at ? 1 : -1));
      setRecent(feed.slice(0, 8));

      setSeries(Array.from(dayMap.values()));
      setKpis({
        visitors: cinsMonth?.length ?? 0,
        visitorsPrev: cinsPrev?.length ?? 0,
        participants: partsMonth?.length ?? 0,
        participantsPrev: partsPrev?.length ?? 0,
        new_customers: newCustomers,
        social_reach: socialReach,
        reviews: revMonth?.length ?? 0,
        redemptions: (redMonth ?? []).filter((r) => r.used_at).length || (redMonth ?? []).length,
      });
      void socialMonth;
      setLoading(false);
    })();
  }, [days, t]);

  if (loading) {
    return (
      <AppPage>
        <AppPageHeader eyebrow={t("pages.partnerDashboard.eyebrow")} title={t("pages.partnerDashboard.loading")} />
        <AppPageBody className="pb-10">
          <PartnerLoadingGrid />
        </AppPageBody>
      </AppPage>
    );
  }

  if (!shopCount) {
    return (
      <AppPage>
        <AppPageHeader
          eyebrow={t("pages.partnerDashboard.getStartedEyebrow")}
          title={t("pages.partnerDashboard.welcome")}
          subtitle={t("pages.partnerDashboard.welcomeSubtitle")}
        />
        <AppPageBody className="max-w-2xl pb-10">
          <PartnerEmptyState
            Icon={Store}
            title={t("partnerDashboardPage.setupFirst")}
            description={t("partnerDashboardPage.setupFirstHint")}
            to="/partner/shop"
            actionLabel={t("partnerDashboardPage.setupProfile")}
          />
          <div className="mt-8 space-y-3">
            <PartnerWorkflowStep
              step={1}
              title={t("partnerDashboardPage.step1Title")}
              description={t("partnerDashboardPage.step1Desc")}
              to="/partner/shop"
              label={t("partnerDashboardPage.shopProfile")}
            />
            <PartnerWorkflowStep
              step={2}
              title={t("partnerDashboardPage.step2Title")}
              description={t("partnerDashboardPage.step2Desc")}
              to="/partner/campaigns"
              label={t("partnerDashboardPage.campaigns")}
            />
            <PartnerWorkflowStep
              step={3}
              title={t("partnerDashboardPage.step3Title")}
              description={t("partnerDashboardPage.step3Desc")}
              to="/partner/verify"
              label={t("partnerDashboardPage.verifyCode")}
            />
          </div>
        </AppPageBody>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerDashboard.eyebrow")}
        title={t("pages.partnerDashboard.welcomeBack", { name: shopName })}
        subtitle={t("pages.partnerDashboard.dashboardSubtitle")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild className={PARTNER_BTN}>
              <Link to="/partner/campaigns">
                <Megaphone className="mr-1 h-4 w-4" /> {t("partnerDashboardPage.newCampaign")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/partner/verify">
                <Shield className="mr-1 h-4 w-4" /> {t("partnerDashboardPage.verifyCode")}
              </Link>
            </Button>
          </div>
        }
      />
      <AppPageBody className="pb-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <PartnerKpiCard
            Icon={Eye}
            label={t("partnerDashboardPage.visitorsMonth")}
            value={kpis.visitors}
            delta={partnerDelta(kpis.visitors, kpis.visitorsPrev)}
            tint="from-amber-500 to-orange-600"
          />
          <PartnerKpiCard
            Icon={Users}
            label={t("partnerDashboardPage.campaignParticipation")}
            value={kpis.participants}
            delta={partnerDelta(kpis.participants, kpis.participantsPrev)}
            tint="from-emerald-500 to-teal-600"
          />
          <PartnerKpiCard Icon={UserPlus} label={t("partnerDashboardPage.newCustomers")} value={kpis.new_customers} tint="from-sky-500 to-blue-600" />
          <PartnerKpiCard
            Icon={Share2}
            label={t("partnerDashboardPage.socialReach")}
            value={formatCompact(kpis.social_reach)}
            tint="from-fuchsia-500 to-pink-600"
          />
          <PartnerKpiCard Icon={Star} label={t("partnerDashboardPage.reviewsGenerated")} value={kpis.reviews} tint="from-yellow-500 to-amber-600" />
          <PartnerKpiCard Icon={Gift} label={t("partnerDashboardPage.rewardRedemptions")} value={kpis.redemptions} tint="from-rose-500 to-red-600" />
        </div>

        <PartnerDashboardCharts series={series} campaignBars={campaignBars} />

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="cofex-app-card lg:col-span-2 p-5">
            <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("partnerDashboardPage.recentActivity")}</h3>
            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-[color:var(--cofex-black)]/55">{t("partnerDashboardPage.noActivity")}</div>
            ) : (
              <ul className="mt-3 divide-y divide-[color:var(--border)]">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                          r.kind === "visit" ? "bg-amber-600" : r.kind === "redeem" ? "bg-rose-600" : "bg-yellow-500"
                        }`}
                      >
                        {r.kind === "visit" ? (
                          <Eye className="h-4 w-4" />
                        ) : r.kind === "redeem" ? (
                          <Gift className="h-4 w-4" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </span>
                      <span className="truncate text-[color:var(--cofex-black)]/80">{r.text}</span>
                    </div>
                    <span className="whitespace-nowrap text-xs text-[color:var(--cofex-black)]/45">
                      {new Date(r.at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="cofex-app-card p-5">
            <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("partnerDashboardPage.quickActions")}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionTile to="/partner/shop" Icon={Camera} label={t("partnerDashboardPage.editProfile")} />
              <ActionTile to="/partner/campaigns" Icon={Megaphone} label={t("partnerDashboardPage.campaigns")} />
              <ActionTile to="/partner/rewards" Icon={Gift} label={t("partnerDashboardPage.rewards")} />
              <ActionTile to="/partner/submissions" Icon={Share2} label={t("partnerDashboardPage.submissions")} />
              <ActionTile to="/partner/verify" Icon={Shield} label={t("partnerDashboardPage.verifyCode")} />
              <ActionTile to="/partner/analytics" Icon={BarChart3} label={t("partnerDashboardPage.analytics")} />
            </div>
          </div>
        </div>

        {(arrivalsQuery.data?.length ?? 0) > 0 && (
          <AppPageSection
            eyebrow={t("partnerDashboardPage.arrivalsEyebrow")}
            title={t("partnerDashboardPage.arrivalsTitle")}
            icon={<Navigation className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
            className="mt-8"
          >
            <ul className="cofex-app-card divide-y overflow-hidden">
              {arrivalsQuery.data!.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div>
                    <div className="font-semibold text-[color:var(--cofex-coffee-deep)]">{a.explorer_name}</div>
                    <div className="text-xs text-[color:var(--cofex-black)]/55">
                      {a.shop_name} · ~{a.eta_minutes} min
                      {a.message ? ` · ${a.message}` : ""}
                    </div>
                  </div>
                  <span className="text-[10px] text-[color:var(--cofex-black)]/45">
                    {new Date(a.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </AppPageSection>
        )}

        <AppPageSection
          eyebrow={t("partnerDashboardPage.eeffocFlow")}
          title={t("partnerDashboardPage.eeffocFlowSubtitle")}
          subtitle={t("partnerDashboardPage.fullLoopSubtitle")}
          className="mt-10"
        >
          <div className="space-y-3">
            <PartnerWorkflowStep
              step={1}
              title={t("partnerDashboardPage.flowStep1Title")}
              description={t("partnerDashboardPage.flowStep1Desc")}
              to="/partner/campaigns"
              label={t("partnerDashboardPage.flowStep1Label")}
            />
            <PartnerWorkflowStep
              step={2}
              title={t("partnerDashboardPage.flowStep2Title")}
              description={t("partnerDashboardPage.flowStep2Desc")}
              to="/partner/submissions"
              label={t("partnerDashboardPage.flowStep2Label")}
            />
            <PartnerWorkflowStep
              step={3}
              title={t("partnerDashboardPage.flowStep3Title")}
              description={t("partnerDashboardPage.flowStep3Desc")}
              to="/partner/verify"
              label={t("partnerDashboardPage.flowStep3Label")}
            />
          </div>
        </AppPageSection>
      </AppPageBody>
    </AppPage>
  );
}

function ActionTile({ to, Icon, label }: { to: string; Icon: typeof Store; label: string }) {
  return (
    <Link
      to={to}
      className="cofex-app-card flex flex-col gap-2 rounded-xl border-0 p-3 shadow-none transition hover:bg-[color:var(--cofex-pastel-blue)]/30"
    >
      <Icon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
      <span className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{label}</span>
    </Link>
  );
}
