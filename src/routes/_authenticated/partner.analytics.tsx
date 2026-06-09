import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Gift, CheckCircle2, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/analytics")({
  head: () => ({ meta: [{ title: "Campaign Analytics — CO:FE(X)" }] }),
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

function PartnerAnalyticsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals>({ participants: 0, check_ins: 0, redemptions: 0, used: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: shops } = await supabase
        .from("coffee_shops")
        .select("id, name")
        .eq("partner_id", user.id);
      const shopIds = (shops ?? []).map((s) => s.id);
      const shopName = new Map<string, string>((shops ?? []).map((s) => [s.id, s.name]));
      if (!shopIds.length) { setLoading(false); return; }

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title, hashtag, status, points_reward, max_participants, required_check_ins, ends_at, coffee_shop_id")
        .in("coffee_shop_id", shopIds)
        .order("created_at", { ascending: false });
      const cIds = (campaigns ?? []).map((c) => c.id);
      if (!cIds.length) { setRows([]); setLoading(false); return; }

      const [{ data: parts }, { data: cins }, { data: reds }] = await Promise.all([
        supabase.from("campaign_participants").select("campaign_id").in("campaign_id", cIds),
        supabase.from("check_ins").select("campaign_id").in("campaign_id", cIds),
        supabase.from("campaign_redemptions").select("campaign_id, used_at").in("campaign_id", cIds),
      ]);
      const pmap = count(parts ?? [], "campaign_id");
      const cmap = count(cins ?? [], "campaign_id");
      const rmap = count(reds ?? [], "campaign_id");
      const umap = new Map<string, number>();
      for (const r of reds ?? []) if (r.used_at && r.campaign_id) umap.set(r.campaign_id, (umap.get(r.campaign_id) ?? 0) + 1);

      const built: Row[] = (campaigns ?? []).map((c: any) => ({
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
      setTotals(built.reduce<Totals>((acc, r) => ({
        participants: acc.participants + r.participants,
        check_ins: acc.check_ins + r.check_ins,
        redemptions: acc.redemptions + r.redemptions,
        used: acc.used + r.used,
      }), { participants: 0, check_ins: 0, redemptions: 0, used: 0 }));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Analytics</div>
        <h1 className="text-3xl font-serif font-bold mt-1">Campaign performance</h1>
        <p className="text-sm text-muted-foreground">Participants, visits and reward utilisation across your EEFFOC drops.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI Icon={Users} label="Participants" value={totals.participants} tint="from-amber-500 to-orange-600" />
        <KPI Icon={TrendingUp} label="Check-ins" value={totals.check_ins} tint="from-emerald-500 to-teal-600" />
        <KPI Icon={Gift} label="Redemptions" value={totals.redemptions} tint="from-rose-500 to-pink-600" />
        <KPI Icon={CheckCircle2} label="Redeemed at counter" value={totals.used} tint="from-violet-500 to-indigo-600" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-zinc-100 animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <BarChart3 className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground">Launch a campaign to start collecting performance data.</p>
          <Link to="/partner/campaigns" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
            Go to campaigns <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[10px] uppercase tracking-widest text-zinc-500 border-b bg-zinc-50">
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
              <div key={r.id} className="grid grid-cols-12 items-center px-5 py-4 border-b last:border-0 text-sm">
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                      {r.status}
                    </span>
                    <span className="text-xs text-zinc-500">{r.shop_name}</span>
                  </div>
                  <div className="font-semibold mt-1">{r.title}</div>
                  <div className="text-xs text-zinc-500">{r.hashtag} · {r.points_reward} pts · needs {r.required_check_ins} visit{r.required_check_ins > 1 ? "s" : ""}</div>
                </div>
                <div className="col-span-2 text-right">
                  <div className="font-semibold">{r.participants}{r.max_participants ? <span className="text-zinc-400 font-normal"> / {r.max_participants}</span> : null}</div>
                  {r.max_participants && (
                    <div className="mt-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${capPct}%` }} />
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-right font-semibold">{r.check_ins}</div>
                <div className="col-span-2 text-right">
                  <div className="font-semibold">{r.redemptions}</div>
                  <div className="text-xs text-zinc-500">{conv}% conv.</div>
                </div>
                <div className="col-span-1 text-right">
                  <div className="font-semibold inline-flex items-center gap-1 justify-end"><Sparkles className="h-3 w-3 text-amber-600" />{r.used}</div>
                  <div className="text-xs text-zinc-500">{useRate}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KPI({ Icon, label, value, tint }: { Icon: any; label: string; value: number; tint: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tint} text-white`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-3xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs uppercase tracking-widest text-zinc-500 mt-1">{label}</div>
    </div>
  );
}

function count<T extends { campaign_id: string | null }>(arr: T[], key: "campaign_id") {
  const m = new Map<string, number>();
  for (const r of arr) {
    const v = r[key];
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}
