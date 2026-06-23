import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling, billingLimitsForShop } from "@/lib/queries/billing";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { BarChart3, Users, Gift, CheckCircle2, TrendingUp, Sparkles, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  PARTNER_BTN,
  PARTNER_CHIP,
  PARTNER_CHIP_ACTIVE,
  PartnerEmptyState,
  PartnerKpiCard,
  PartnerStatusPill,
} from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/analytics")({
  head: () => ({ meta: [{ title: "Campaign Analytics · CO:FE(X)" }] }),
  component: PartnerAnalyticsPage,
});

type Row = {
  id: string;
  title: string;
  hashtag: string | null;
  status: string;
  points_reward: number;
  max_participants: number | null;
  required_check_ins: number;
  ends_at: string | null;
  shop_name: string;
  participants: number;
  check_ins: number;
  redemptions: number;
  used: number;
};

type Totals = { participants: number; check_ins: number; redemptions: number; used: number };

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "all", label: "All time", days: 0 },
];

import {
  endOfLocalDayISO,
  localDateFromTimestamp,
  startOfLocalDayISO,
  toLocalDateString,
} from "@/lib/local-date-range";

function PartnerAnalyticsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);
  const primaryShopId = billing?.shops[0]?.coffee_shop_id;
  const canExport =
    primaryShopId !== undefined &&
    billing !== undefined &&
    billingLimitsForShop(billing, primaryShopId).limits.analyticsExport;

  const [preset, setPreset] = useState("30d");
  const [from, setFrom] = useState(() =>
    toLocalDateString(new Date(Date.now() - 30 * 86400000)),
  );
  const [to, setTo] = useState(() => toLocalDateString(new Date()));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ participants: 0, check_ins: 0, redemptions: 0, used: 0 });
  const [insights, setInsights] = useState({
    conversionPct: 0,
    repeatVisitors: 0,
    peakHourLabel: "-",
    topRewardType: "-",
  });

  function applyPreset(id: string) {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (p.days === 0) {
      setFrom("");
      setTo(toLocalDateString(new Date()));
      return;
    }
    setFrom(toLocalDateString(new Date(Date.now() - p.days * 86400000)));
    setTo(toLocalDateString(new Date()));
  }

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
      const shopName = new Map<string, string>((shops ?? []).map((s) => [s.id, s.name]));
      if (!shopIds.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, hashtag, status, points_reward, max_participants, required_check_ins, ends_at, coffee_shop_id, reward_type")
        .in("coffee_shop_id", shopIds)
        .order("created_at", { ascending: false });
      const cIds = (campaigns ?? []).map((c) => c.id);
      if (!cIds.length) {
        setRows([]);
        setLoading(false);
        return;
      }

      const fromISO = startOfLocalDayISO(from);
      const toISO = endOfLocalDayISO(to);

      const partsQ = supabase.from("campaign_participants").select("campaign_id, joined_at").in("campaign_id", cIds);
      const cinsQ = supabase.from("check_ins").select("campaign_id, created_at").in("campaign_id", cIds);
      const redsQ = supabase.from("campaign_redemptions").select("campaign_id, used_at, redeemed_at").in("campaign_id", cIds);
      if (fromISO) {
        partsQ.gte("joined_at", fromISO);
        cinsQ.gte("created_at", fromISO);
        redsQ.gte("redeemed_at", fromISO);
      }
      if (toISO) {
        partsQ.lte("joined_at", toISO);
        cinsQ.lte("created_at", toISO);
        redsQ.lte("redeemed_at", toISO);
      }

      const [{ data: parts }, { data: cins }, { data: reds }] = await Promise.all([partsQ, cinsQ, redsQ]);

      const pmap = count(parts ?? []);
      const cmap = count(cins ?? []);
      const rmap = count(reds ?? []);
      const umap = new Map<string, number>();
      for (const r of reds ?? []) if (r.used_at && r.campaign_id) umap.set(r.campaign_id, (umap.get(r.campaign_id) ?? 0) + 1);

      const built: Row[] = (campaigns ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        hashtag: c.hashtag,
        status: c.status,
        points_reward: c.points_reward,
        max_participants: c.max_participants,
        required_check_ins: c.required_check_ins ?? 1,
        ends_at: c.ends_at,
        shop_name: shopName.get(c.coffee_shop_id) ?? "",
        participants: pmap.get(c.id) ?? 0,
        check_ins: cmap.get(c.id) ?? 0,
        redemptions: rmap.get(c.id) ?? 0,
        used: umap.get(c.id) ?? 0,
      }));
      setRows(built);
      setTotals(
        built.reduce<Totals>(
          (acc, r) => ({
            participants: acc.participants + r.participants,
            check_ins: acc.check_ins + r.check_ins,
            redemptions: acc.redemptions + r.redemptions,
            used: acc.used + r.used,
          }),
          { participants: 0, check_ins: 0, redemptions: 0, used: 0 },
        ),
      );

      const hourCounts = new Map<number, number>();
      for (const ci of cins ?? []) {
        const h = new Date(ci.created_at).getHours();
        hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      }
      let peakHour = -1;
      let peakCount = 0;
      for (const [h, n] of hourCounts) {
        if (n > peakCount) {
          peakCount = n;
          peakHour = h;
        }
      }

      const userVisitCounts = new Map<string, number>();
      const shopCinsQ = supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds);
      if (fromISO) shopCinsQ.gte("created_at", fromISO);
      if (toISO) shopCinsQ.lte("created_at", toISO);
      const { data: shopCins } = await shopCinsQ;
      for (const ci of shopCins ?? []) {
        userVisitCounts.set(ci.user_id, (userVisitCounts.get(ci.user_id) ?? 0) + 1);
      }
      const repeatVisitors = [...userVisitCounts.values()].filter((n) => n >= 2).length;

      const rewardTypeCounts = new Map<string, number>();
      for (const r of reds ?? []) {
        if (!r.used_at || !r.campaign_id) continue;
        const camp = (campaigns ?? []).find((c) => c.id === r.campaign_id);
        const rt = camp?.reward_type ?? "coffee";
        rewardTypeCounts.set(rt, (rewardTypeCounts.get(rt) ?? 0) + 1);
      }
      let topRewardType = "-";
      let topN = 0;
      for (const [rt, n] of rewardTypeCounts) {
        if (n > topN) {
          topN = n;
          topRewardType = rt;
        }
      }

      const totalP = built.reduce((s, r) => s + r.participants, 0);
      const totalR = built.reduce((s, r) => s + r.redemptions, 0);
      setInsights({
        conversionPct: totalP ? Math.round((totalR / totalP) * 100) : 0,
        repeatVisitors,
        peakHourLabel: peakHour >= 0 ? `${String(peakHour).padStart(2, "0")}:00` : t("partnerAnalyticsPage.noData"),
        topRewardType: topN > 0 ? topRewardType.replace(/_/g, " ") : t("partnerAnalyticsPage.noData"),
      });
      setLoading(false);
    })();
  }, [from, to, t]);

  function exportCSV() {
    if (!canExport) {
      toast.message("CSV export is included on Pro plans", {
        description: "Upgrade billing to download campaign analytics.",
      });
      return;
    }
    const headers = [
      "Campaign",
      "Shop",
      "Hashtag",
      "Status",
      "Points",
      "Required check-ins",
      "Participants",
      "Max",
      "Check-ins",
      "Redemptions",
      "Used at counter",
      "Conversion %",
      "Use rate %",
      "Ends",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const conv = r.participants ? Math.round((r.redemptions / r.participants) * 100) : 0;
      const useRate = r.redemptions ? Math.round((r.used / r.redemptions) * 100) : 0;
      lines.push(
        [
          csv(r.title),
          csv(r.shop_name),
          csv(r.hashtag ?? ""),
          r.status,
          r.points_reward,
          r.required_check_ins,
          r.participants,
          r.max_participants ?? "",
          r.check_ins,
          r.redemptions,
          r.used,
          conv,
          useRate,
          r.ends_at ? localDateFromTimestamp(r.ends_at) : "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eeffoc-analytics_${from || "all"}_to_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerAnalytics.eyebrow")}
        title={t("pages.partnerAnalytics.title")}
        subtitle={t("pages.partnerAnalytics.subtitle")}
        action={
          <Button onClick={exportCSV} variant="outline" disabled={!rows.length} className="rounded-full">
            <Download className="mr-1 h-4 w-4" /> Export CSV
            {!canExport && <span className="ml-1 text-[10px] opacity-60">(Pro)</span>}
          </Button>
        }
      />
      <AppPageBody className="max-w-6xl pb-10">
        <div className="cofex-app-card mb-6 flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={preset === p.id ? PARTNER_CHIP_ACTIVE : PARTNER_CHIP}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">From</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPreset("custom");
                }}
                className="h-9 w-40"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">To</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPreset("custom");
                }}
                className="h-9 w-40"
              />
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <PartnerKpiCard Icon={Users} label={t("partnerAnalyticsPage.conversionRate")} value={`${insights.conversionPct}%`} tint="from-violet-500 to-purple-600" />
          <PartnerKpiCard Icon={TrendingUp} label={t("partnerAnalyticsPage.repeatVisitors")} value={insights.repeatVisitors} tint="from-emerald-500 to-teal-600" />
          <PartnerKpiCard Icon={Sparkles} label={t("partnerAnalyticsPage.peakHour")} value={insights.peakHourLabel} tint="from-amber-500 to-orange-600" />
          <PartnerKpiCard Icon={Gift} label={t("partnerAnalyticsPage.topReward")} value={insights.topRewardType} tint="from-rose-500 to-pink-600" />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <PartnerKpiCard Icon={Users} label="Participants" value={totals.participants} tint="from-amber-500 to-orange-600" />
          <PartnerKpiCard Icon={TrendingUp} label="Check-ins" value={totals.check_ins} tint="from-emerald-500 to-teal-600" />
          <PartnerKpiCard Icon={Gift} label="Redemptions" value={totals.redemptions} tint="from-rose-500 to-pink-600" />
          <PartnerKpiCard Icon={CheckCircle2} label="Redeemed at counter" value={totals.used} tint="from-violet-500 to-indigo-600" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cofex-app-card h-24 animate-pulse bg-[color:var(--cofex-cream)]" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <PartnerEmptyState
            Icon={BarChart3}
            title="No campaigns yet"
            description="Launch a campaign to start collecting performance data."
            to="/partner/campaigns"
            actionLabel="Go to campaigns"
          />
        ) : (
          <div className="cofex-app-card overflow-hidden p-0">
            <div className="grid grid-cols-12 border-b border-[color:var(--border)] bg-[color:var(--cofex-cream)] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">
              <div className="col-span-5">Campaign</div>
              <div className="col-span-2 text-right">Participants</div>
              <div className="col-span-2 text-right">Check-ins</div>
              <div className="col-span-2 text-right">Redemptions</div>
              <div className="col-span-1 text-right">Used</div>
            </div>
            {rows.map((r) => {
              const capPct = r.max_participants ? Math.min(100, Math.round((r.participants / r.max_participants) * 100)) : 0;
              const conv = r.participants ? Math.round((r.redemptions / r.participants) * 100) : 0;
              const useRate = r.redemptions ? Math.round((r.used / r.redemptions) * 100) : 0;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-12 items-center border-b border-[color:var(--border)] px-5 py-4 text-sm last:border-0"
                >
                  <div className="col-span-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <PartnerStatusPill tone={r.status === "active" ? "success" : "neutral"}>{r.status}</PartnerStatusPill>
                      <span className="text-xs text-[color:var(--cofex-black)]/45">{r.shop_name}</span>
                    </div>
                    <div className="mt-1 font-bold text-[color:var(--cofex-coffee-deep)]">{r.title}</div>
                    <div className="text-xs text-[color:var(--cofex-black)]/45">
                      {r.hashtag} · {r.points_reward} pts · needs {r.required_check_ins} visit{r.required_check_ins > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="font-bold">
                      {r.participants}
                      {r.max_participants ? <span className="font-normal text-[color:var(--cofex-black)]/35"> / {r.max_participants}</span> : null}
                    </div>
                    {r.max_participants && (
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
                        <div className="h-full bg-[color:var(--cofex-cyan)]" style={{ width: `${capPct}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-right font-bold">{r.check_ins}</div>
                  <div className="col-span-2 text-right">
                    <div className="font-bold">{r.redemptions}</div>
                    <div className="text-xs text-[color:var(--cofex-black)]/45">{conv}% conv.</div>
                  </div>
                  <div className="col-span-1 text-right">
                    <div className="inline-flex items-center justify-end gap-1 font-bold">
                      <Sparkles className="h-3 w-3 text-[color:var(--cofex-cyan)]" />
                      {r.used}
                    </div>
                    <div className="text-xs text-[color:var(--cofex-black)]/45">{useRate}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!canExport && rows.length > 0 && (
          <p className="mt-4 text-center text-xs text-[color:var(--cofex-black)]/45">
            <Link to="/partner/billing" className="font-semibold text-[color:var(--cofex-cyan)] hover:underline">
              Upgrade to Pro
            </Link>{" "}
            for CSV export and promoted discover placement.
          </p>
        )}
      </AppPageBody>
    </AppPage>
  );
}

function count(arr: { campaign_id: string | null }[]) {
  const m = new Map<string, number>();
  for (const r of arr) {
    if (!r.campaign_id) continue;
    m.set(r.campaign_id, (m.get(r.campaign_id) ?? 0) + 1);
  }
  return m;
}

function csv(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
