import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Eye, UserPlus, Share2, Star, Gift, ArrowRight, Megaphone,
  Store, Camera, Shield, BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/partner/")({
  head: () => ({ meta: [{ title: "Partner dashboard — CO:FE(X)" }] }),
  component: PartnerDashboard,
});

type Daily = { day: string; visitors: number; new_customers: number; redemptions: number; reviews: number };

function startOfDayISO(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(); }
function lastNDays(n: number) {
  const days: { key: string; label: string }[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
  }
  return days;
}

function PartnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState<string>("");
  const [shopCount, setShopCount] = useState(0);
  const [kpis, setKpis] = useState({
    visitors: 0, participants: 0, new_customers: 0,
    social_reach: 0, reviews: 0, redemptions: 0,
    visitorsPrev: 0, participantsPrev: 0,
  });
  const [series, setSeries] = useState<Daily[]>([]);
  const [campaignBars, setCampaignBars] = useState<{ name: string; participants: number; redemptions: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; kind: string; text: string; at: string }[]>([]);

  const days = useMemo(() => lastNDays(30), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: shops } = await supabase
        .from("coffee_shops").select("id, name").eq("partner_id", user.id);
      const shopIds = (shops ?? []).map((s) => s.id);
      setShopCount(shopIds.length);
      setShopName(shops?.[0]?.name ?? "Your café");
      if (!shopIds.length) { setLoading(false); return; }

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const prevMonthStart = new Date(monthStart); prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const monthStartISO = monthStart.toISOString();
      const prevMonthStartISO = prevMonthStart.toISOString();
      const since30 = startOfDayISO(new Date(Date.now() - 29 * 86400000));

      // Campaigns scoped to these shops
      const { data: campaigns } = await supabase
        .from("campaigns").select("id, title").in("coffee_shop_id", shopIds);
      const cIds = (campaigns ?? []).map((c) => c.id);
      const cTitle = new Map<string, string>((campaigns ?? []).map((c) => [c.id, c.title]));

      // Parallel fetches
      const [
        { data: cinsMonth }, { data: cinsPrev }, { data: cinsSeries },
        { data: revMonth }, { data: revSeries },
        { data: redMonth }, { data: redSeries },
        { data: partsMonth }, { data: partsPrev },
        { data: socialApproved }, { count: socialMonth },
      ] = await Promise.all([
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", monthStartISO),
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", prevMonthStartISO).lt("created_at", monthStartISO),
        supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds).gte("created_at", since30),
        supabase.from("reviews").select("id, created_at").in("coffee_shop_id", shopIds).gte("created_at", monthStartISO),
        supabase.from("reviews").select("id, created_at").in("coffee_shop_id", shopIds).gte("created_at", since30),
        cIds.length
          ? supabase.from("campaign_redemptions").select("id, redeemed_at, used_at, campaign_id").in("campaign_id", cIds).gte("redeemed_at", monthStartISO)
          : Promise.resolve({ data: [] as any[] }),
        cIds.length
          ? supabase.from("campaign_redemptions").select("id, redeemed_at, campaign_id").in("campaign_id", cIds).gte("redeemed_at", since30)
          : Promise.resolve({ data: [] as any[] }),
        cIds.length
          ? supabase.from("campaign_participants").select("user_id, joined_at, campaign_id").in("campaign_id", cIds).gte("joined_at", monthStartISO)
          : Promise.resolve({ data: [] as any[] }),
        cIds.length
          ? supabase.from("campaign_participants").select("user_id, joined_at, campaign_id").in("campaign_id", cIds).gte("joined_at", prevMonthStartISO).lt("joined_at", monthStartISO)
          : Promise.resolve({ data: [] as any[] }),
        cIds.length
          ? (supabase as any).from("social_submissions").select("platform, created_at, campaign_id").in("campaign_id", cIds).eq("status", "approved").gte("created_at", monthStartISO)
          : Promise.resolve({ data: [] as any[] }),
        cIds.length
          ? (supabase as any).from("social_submissions").select("*", { count: "exact", head: true }).in("campaign_id", cIds).eq("status", "approved").gte("created_at", monthStartISO)
          : Promise.resolve({ count: 0 }),
      ]);

      // New customers = first-time check-in this month
      const userFirsts = new Map<string, string>();
      const allHistory = await supabase.from("check_ins").select("user_id, created_at").in("coffee_shop_id", shopIds);
      for (const r of (allHistory.data ?? []) as any[]) {
        const prev = userFirsts.get(r.user_id);
        if (!prev || r.created_at < prev) userFirsts.set(r.user_id, r.created_at);
      }
      let newCustomers = 0;
      for (const [, first] of userFirsts) if (first >= monthStartISO) newCustomers += 1;

      const REACH_PER_POST: Record<string, number> = {
        instagram_post: 600, instagram_story: 350, tiktok: 1200, facebook: 400, screenshot: 200,
      };
      const socialReach = ((socialApproved as any[]) ?? []).reduce(
        (s, r: any) => s + (REACH_PER_POST[r.platform] ?? 300), 0,
      );

      // Build 30d series
      const dayMap = new Map<string, Daily>();
      for (const d of days) dayMap.set(d.key, { day: d.label, visitors: 0, new_customers: 0, redemptions: 0, reviews: 0 });
      for (const r of (cinsSeries ?? []) as any[]) {
        const k = r.created_at.slice(0, 10);
        const row = dayMap.get(k); if (row) row.visitors += 1;
      }
      for (const r of (revSeries ?? []) as any[]) {
        const k = r.created_at.slice(0, 10);
        const row = dayMap.get(k); if (row) row.reviews += 1;
      }
      for (const r of (redSeries ?? []) as any[]) {
        const k = (r.redeemed_at ?? "").slice(0, 10);
        const row = dayMap.get(k); if (row) row.redemptions += 1;
      }
      // New customers per day in window
      for (const [uid, first] of userFirsts) {
        const k = first.slice(0, 10);
        const row = dayMap.get(k); if (row) row.new_customers += 1;
        void uid;
      }

      // Campaign bars
      const partsByC = new Map<string, number>();
      const redsByC = new Map<string, number>();
      for (const p of (partsMonth as any[]) ?? []) partsByC.set(p.campaign_id, (partsByC.get(p.campaign_id) ?? 0) + 1);
      for (const r of (redMonth as any[]) ?? []) redsByC.set(r.campaign_id, (redsByC.get(r.campaign_id) ?? 0) + 1);
      const bars = (campaigns ?? []).map((c: any) => ({
        name: (cTitle.get(c.id) ?? "").slice(0, 18),
        participants: partsByC.get(c.id) ?? 0,
        redemptions: redsByC.get(c.id) ?? 0,
      })).sort((a, b) => (b.participants + b.redemptions) - (a.participants + a.redemptions)).slice(0, 6);
      setCampaignBars(bars);

      // Recent activity feed
      const feed: { id: string; kind: string; text: string; at: string }[] = [];
      for (const r of ((cinsSeries as any[]) ?? []).slice(-5)) feed.push({ id: "ci-" + r.created_at, kind: "visit", text: "A visitor checked in", at: r.created_at });
      for (const r of ((redSeries as any[]) ?? []).slice(-5)) feed.push({ id: "rd-" + r.id, kind: "redeem", text: `Reward redeemed — ${cTitle.get(r.campaign_id) ?? "campaign"}`, at: r.redeemed_at });
      for (const r of ((revSeries as any[]) ?? []).slice(-5)) feed.push({ id: "rv-" + r.id, kind: "review", text: "New review received", at: r.created_at });
      feed.sort((a, b) => (a.at < b.at ? 1 : -1));
      setRecent(feed.slice(0, 8));

      setSeries(Array.from(dayMap.values()));
      setKpis({
        visitors: (cinsMonth as any[])?.length ?? 0,
        visitorsPrev: (cinsPrev as any[])?.length ?? 0,
        participants: (partsMonth as any[])?.length ?? 0,
        participantsPrev: (partsPrev as any[])?.length ?? 0,
        new_customers: newCustomers,
        social_reach: socialReach,
        reviews: (revMonth as any[])?.length ?? 0,
        redemptions: ((redMonth as any[]) ?? []).filter((r: any) => r.used_at).length || ((redMonth as any[]) ?? []).length,
      });
      void socialMonth;
      setLoading(false);
    })();
  }, [days]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="h-10 w-72 bg-zinc-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-zinc-100 animate-pulse" />)}
        </div>
        <div className="h-72 rounded-2xl bg-zinc-100 animate-pulse" />
      </div>
    );
  }

  if (!shopCount) {
    return (
      <div className="p-10 max-w-3xl mx-auto text-center">
        <Store className="h-12 w-12 mx-auto text-amber-700 mb-3" />
        <h1 className="text-2xl font-serif font-bold">Set up your café first</h1>
        <p className="text-sm text-muted-foreground mt-1">Add your shop profile to start seeing visitors, campaigns and rewards data here.</p>
        <Link to="/partner/shop" className="inline-flex items-center gap-1 mt-4 px-4 py-2 rounded-full bg-amber-700 text-white text-sm font-medium">
          Set up profile <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Host dashboard</div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold mt-1">Welcome back, {shopName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening across your café this month.</p>
        </div>
        <div className="flex gap-2">
          <QuickLink to="/partner/campaigns" Icon={Megaphone} label="New campaign" primary />
          <QuickLink to="/partner/verify" Icon={Shield} label="Verify code" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KPI Icon={Eye} label="Visitors this month" value={kpis.visitors} delta={delta(kpis.visitors, kpis.visitorsPrev)} tint="from-amber-500 to-orange-600" />
        <KPI Icon={Users} label="Campaign participation" value={kpis.participants} delta={delta(kpis.participants, kpis.participantsPrev)} tint="from-emerald-500 to-teal-600" />
        <KPI Icon={UserPlus} label="New customers" value={kpis.new_customers} tint="from-sky-500 to-blue-600" />
        <KPI Icon={Share2} label="Social reach generated" value={formatCompact(kpis.social_reach)} tint="from-fuchsia-500 to-pink-600" />
        <KPI Icon={Star} label="Reviews generated" value={kpis.reviews} tint="from-yellow-500 to-amber-600" />
        <KPI Icon={Gift} label="Reward redemptions" value={kpis.redemptions} tint="from-rose-500 to-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Activity — last 30 days</h3>
              <p className="text-xs text-muted-foreground">Visitors, new customers and redemptions per day.</p>
            </div>
            <Link to="/partner/analytics" className="text-xs text-amber-700 inline-flex items-center gap-1">Open analytics <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -10, right: 4, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b45309" stopOpacity={0.35} /><stop offset="100%" stopColor="#b45309" stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} /><stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#71717a" }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="visitors" stroke="#b45309" fill="url(#gv)" name="Visitors" />
                <Area type="monotone" dataKey="new_customers" stroke="#0ea5e9" fill="url(#gn)" name="New" />
                <Area type="monotone" dataKey="redemptions" stroke="#e11d48" fill="transparent" name="Redemptions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="font-semibold mb-1">Top campaigns</h3>
          <p className="text-xs text-muted-foreground mb-3">Participants vs. redemptions this month.</p>
          <div className="h-64">
            {campaignBars.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <BarChart3 className="h-6 w-6 mb-2 opacity-40" />
                Launch a campaign to see data.
                <Link to="/partner/campaigns" className="mt-2 text-amber-700 text-xs">Create one →</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignBars} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#71717a" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Bar dataKey="participants" fill="#b45309" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="redemptions" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border bg-white p-5">
          <h3 className="font-semibold mb-3">Recent activity</h3>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No activity yet.</div>
          ) : (
            <ul className="divide-y">
              {recent.map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center text-white ${r.kind === "visit" ? "bg-amber-600" : r.kind === "redeem" ? "bg-rose-600" : "bg-yellow-500"}`}>
                      {r.kind === "visit" ? <Eye className="h-4 w-4" /> : r.kind === "redeem" ? <Gift className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </span>
                    <span className="truncate">{r.text}</span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(r.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <h3 className="font-semibold mb-3">Quick actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <ActionTile to="/partner/shop" Icon={Camera} label="Edit profile" />
            <ActionTile to="/partner/campaigns" Icon={Megaphone} label="Campaigns" />
            <ActionTile to="/partner/rewards" Icon={Gift} label="Rewards" />
            <ActionTile to="/partner/submissions" Icon={Share2} label="Submissions" />
            <ActionTile to="/partner/verify" Icon={Shield} label="Verify code" />
            <ActionTile to="/partner/analytics" Icon={BarChart3} label="Analytics" />
          </div>
        </div>
      </div>
    </div>
  );
}

function delta(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}
function formatCompact(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function KPI({ Icon, label, value, delta, tint }: { Icon: any; label: string; value: number | string; delta?: number; tint: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between">
        <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tint} text-white flex items-center justify-center`}>
          <Icon className="h-5 w-5" />
        </span>
        {typeof delta === "number" && (
          <span className={`text-xs font-medium ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickLink({ to, Icon, label, primary }: { to: string; Icon: any; label: string; primary?: boolean }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-full ${primary ? "bg-amber-700 text-white hover:bg-amber-800" : "border bg-white hover:bg-zinc-50"}`}>
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

function ActionTile({ to, Icon, label }: { to: string; Icon: any; label: string }) {
  return (
    <Link to={to} className="rounded-xl border bg-white p-3 hover:bg-amber-50 hover:border-amber-200 flex flex-col gap-2">
      <Icon className="h-5 w-5 text-amber-700" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
