import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Coffee, Sparkles, Gift, Users, Copy, Check, ArrowDownLeft, ArrowUpRight, Wallet,
  Megaphone, Share2, MessageSquareText, Download, Calendar, Hourglass, History, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/wallet")({
  head: () => ({ meta: [{ title: "Wallet — CO:FE(X)" }] }),
  component: WalletPage,
});

type Ledger = { id: string; delta: number; balance_after: number; source: string; metadata: any; created_at: string; expires_at: string | null };
type CatalogItem = { id: string; name: string; description: string | null; cost_points: number; emoji: string | null; tier: string | null };
type Redemption = { id: string; catalog_id: string; points_spent: number; redemption_code: string; used_at: string | null; created_at: string };
type ExpiringBucket = { bucket: string; expires_at: string; amount: number };

const SOURCE_META: Record<string, { label: string; Icon: any; color: string }> = {
  check_in: { label: "Check-in", Icon: Coffee, color: "text-amber-700 bg-amber-50" },
  review: { label: "Review", Icon: MessageSquareText, color: "text-blue-700 bg-blue-50" },
  campaign_redemption: { label: "Campaign", Icon: Megaphone, color: "text-fuchsia-700 bg-fuchsia-50" },
  social_post: { label: "Social post", Icon: Share2, color: "text-rose-700 bg-rose-50" },
  referral_bonus: { label: "Referral bonus", Icon: Users, color: "text-emerald-700 bg-emerald-50" },
  referral_reward: { label: "Referral reward", Icon: Users, color: "text-emerald-700 bg-emerald-50" },
  catalog_redemption: { label: "Reward redeemed", Icon: Gift, color: "text-zinc-700 bg-zinc-100" },
};

const EXPIRY_OPTIONS = [
  { value: "off", label: "No expiration" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "12 months" },
  { value: "730", label: "24 months" },
];

function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [claimInput, setClaimInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expireDays, setExpireDays] = useState<string>("off");
  const [expiring, setExpiring] = useState<ExpiringBucket[]>([]);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: cat }, { data: red }, { data: buckets }] = await Promise.all([
      supabase.from("profiles").select("total_points, referral_code, referred_by, points_expire_days").eq("id", user.id).maybeSingle() as any,
      (supabase as any).from("reward_catalog").select("*").eq("active", true).order("sort_order"),
      (supabase as any).from("catalog_redemptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      (supabase as any).rpc("get_expiring_points_buckets"),
    ]);
    setBalance(prof?.total_points ?? 0);
    setRefCode(prof?.referral_code ?? null);
    setReferredBy(prof?.referred_by ?? null);
    setExpireDays(prof?.points_expire_days ? String(prof.points_expire_days) : "off");
    setCatalog((cat as CatalogItem[]) ?? []);
    setRedemptions((red as Redemption[]) ?? []);
    setExpiring((buckets as ExpiringBucket[]) ?? []);
    setLoading(false);
  }, []);

  const loadLedger = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let q = (supabase as any).from("points_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (from) q = q.gte("created_at", new Date(from).toISOString());
    if (to) q = q.lte("created_at", new Date(new Date(to).getTime() + 86400000 - 1).toISOString());
    const { data } = await q;
    setLedger((data as Ledger[]) ?? []);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLedger(); }, [loadLedger]);

  async function redeem(item: CatalogItem) {
    if (balance < item.cost_points) return toast.error(`Need ${item.cost_points - balance} more points`);
    setBusyId(item.id);
    const { data, error } = await (supabase as any).rpc("redeem_catalog_item", { _item_id: item.id });
    setBusyId(null);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(`Reward unlocked: ${data.item}`);
    load(); loadLedger();
  }

  async function claim() {
    if (!claimInput.trim()) return;
    const { error } = await (supabase as any).rpc("claim_referral", { _code: claimInput.trim() });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success("Referral claimed! +50 points");
    setClaimInput(""); load(); loadLedger();
  }

  async function updateExpiry(val: string) {
    setExpireDays(val);
    const days = val === "off" ? null : Number(val);
    const { error } = await (supabase as any).rpc("set_points_expiration_policy", { _days: days });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(days ? `Points will expire after ${days} days (applies to new points)` : "Points expiration disabled");
    load();
  }

  function copyCode() {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  function exportCsv() {
    if (ledger.length === 0) return toast.error("Nothing to export");
    const rows = [["Date", "Source", "Delta", "Balance after", "Expires at", "Reference"]];
    ledger.forEach((l) => rows.push([
      new Date(l.created_at).toISOString(),
      SOURCE_META[l.source]?.label ?? l.source,
      String(l.delta),
      String(l.balance_after),
      l.expires_at ? new Date(l.expires_at).toISOString() : "",
      JSON.stringify(l.metadata ?? {}),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cofex-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    const earned = ledger.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
    const spent = ledger.filter((l) => l.delta < 0).reduce((s, l) => s + Math.abs(l.delta), 0);
    return { earned, spent };
  }, [ledger]);

  const expiringSoon = useMemo(
    () => expiring.filter((b) => b.bucket === "7d" || b.bucket === "30d").reduce((s, b) => s + Number(b.amount), 0),
    [expiring]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50/40 to-white pb-20">
      <div className="mx-auto max-w-2xl px-5 pt-6 space-y-6">
        {/* Balance card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-amber-900 via-orange-800 to-rose-900 text-white p-6 shadow-2xl overflow-hidden">
          <div className="absolute -right-10 -top-10 text-[200px] opacity-10 select-none leading-none">☕</div>
          <div className="relative">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] opacity-80">
              <Wallet className="h-3 w-3" /> CO:FE(X) Wallet
            </div>
            <div className="mt-3 text-5xl font-extrabold tracking-tight tabular-nums">
              {balance.toLocaleString()}
              <span className="text-base font-medium opacity-70 ml-2">pts</span>
            </div>
            <div className="mt-1 text-xs opacity-80">Internal reward currency · upgradeable to on-chain later</div>
            {expiringSoon > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-semibold">
                <AlertTriangle className="h-3 w-3" /> {expiringSoon.toLocaleString()} pts expiring within 30 days
              </div>
            )}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
              <Earn Icon={Coffee} label="Check-in" pts={10} />
              <Earn Icon={MessageSquareText} label="Review" pts={5} />
              <Earn Icon={Share2} label="Social post" pts={25} />
              <Earn Icon={Megaphone} label="Campaign" pts="varies" />
              <Earn Icon={Users} label="Refer a friend" pts={100} />
              <Earn Icon={Users} label="Get referred" pts={50} />
            </div>
          </div>
        </div>

        {/* Expiration policy */}
        <section className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center"><Hourglass className="h-4 w-4" /></div>
              <div>
                <div className="font-semibold text-sm">Point expiration</div>
                <div className="text-xs text-zinc-500 max-w-xs">Optional — choose how long newly earned points stay valid. Existing points keep their original expiry.</div>
              </div>
            </div>
            <Select value={expireDays} onValueChange={updateExpiry}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{EXPIRY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          {expiring.length > 0 && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2">Expiration timeline</div>
              <div className="space-y-1.5">
                {expiring.slice(0, 8).map((b, i) => {
                  const isExpired = b.bucket === "expired";
                  const isSoon = b.bucket === "7d" || b.bucket === "30d";
                  const date = new Date(b.expires_at);
                  return (
                    <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isExpired ? "bg-rose-50 text-rose-900" : isSoon ? "bg-amber-50 text-amber-900" : "bg-zinc-50 text-zinc-700"}`}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                        <span>{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        {isExpired && <span className="text-[10px] uppercase font-bold">Expired</span>}
                        {isSoon && !isExpired && <span className="text-[10px] uppercase font-bold">Soon</span>}
                      </div>
                      <span className="font-bold tabular-nums">{Number(b.amount).toLocaleString()} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Catalog */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold text-zinc-900 inline-flex items-center gap-2"><Gift className="h-5 w-5 text-amber-700" /> Redeem rewards</h2>
            <span className="text-xs text-zinc-500">Balance: {balance.toLocaleString()} pts</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {catalog.map((item) => {
              const can = balance >= item.cost_points;
              const isPremium = item.tier === "premium";
              return (
                <div key={item.id} className={`rounded-2xl border p-4 bg-white transition hover:shadow-md ${isPremium ? "border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100" : "border-zinc-200"}`}>
                  <div className="text-4xl">{item.emoji ?? "☕"}</div>
                  <div className="mt-2 font-bold text-zinc-900">{item.name}</div>
                  {item.description && <div className="text-xs text-zinc-500 mt-0.5 leading-snug">{item.description}</div>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-800">{item.cost_points} pts</span>
                    {isPremium && <span className="text-[9px] uppercase tracking-widest font-bold bg-amber-700 text-white rounded-full px-2 py-0.5">Premium</span>}
                  </div>
                  <Button onClick={() => redeem(item)} disabled={!can || busyId === item.id} size="sm" className="w-full mt-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50">
                    {busyId === item.id ? "Redeeming…" : can ? "Redeem" : `Need ${item.cost_points - balance} more`}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Redemption history */}
        <section>
          <h2 className="text-sm font-bold text-zinc-900 mb-2 inline-flex items-center gap-1.5"><History className="h-4 w-4 text-amber-700" /> Redemption history</h2>
          {redemptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground rounded-2xl border bg-white">No redemptions yet.</div>
          ) : (
            <div className="rounded-2xl border bg-white overflow-hidden divide-y">
              {redemptions.map((r) => {
                const item = catalog.find((c) => c.id === r.catalog_id);
                const status: "active" | "used" | "expired" = r.used_at ? "used" : "active";
                const statusStyle =
                  status === "used" ? "bg-zinc-100 text-zinc-700" :
                  status === "expired" ? "bg-rose-100 text-rose-700" :
                  "bg-emerald-100 text-emerald-700";
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <div className="text-2xl">{item?.emoji ?? "🎁"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">{item?.name ?? "Reward"}</div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 ${statusStyle}`}>{status}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {status === "used" ? `Used ${new Date(r.used_at!).toLocaleString()}` : `Issued ${new Date(r.created_at).toLocaleDateString()}`}
                        {" · "}{r.points_spent} pts spent
                      </div>
                    </div>
                    <div className="font-mono text-xs tracking-[0.2em] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">{r.redemption_code}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Referrals */}
        <section className="rounded-2xl border-2 border-dashed border-amber-300 p-5 bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-900 font-bold"><Users className="h-5 w-5" /> Refer friends, earn points</div>
          <p className="text-xs text-amber-900/80 mt-1">Share your code. They get 50 pts, you get 100 pts when they join.</p>
          {refCode && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 font-mono text-lg font-bold tracking-[0.3em] text-amber-900 bg-white border-2 border-amber-400 rounded-lg px-4 py-2 text-center">{refCode}</div>
              <Button onClick={copyCode} size="sm" variant="outline" className="border-amber-400">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {!referredBy && (
            <div className="mt-4 pt-4 border-t border-amber-200">
              <div className="text-xs text-amber-900/80 mb-1.5">Got a code from a friend?</div>
              <div className="flex gap-2">
                <Input value={claimInput} onChange={(e) => setClaimInput(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="font-mono tracking-widest text-center uppercase bg-white" maxLength={12} />
                <Button onClick={claim} disabled={!claimInput.trim()} className="bg-amber-700 hover:bg-amber-800">Claim</Button>
              </div>
            </div>
          )}
        </section>

        {/* Ledger */}
        <section>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-zinc-900 inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-amber-700" /> Activity & ledger</h2>
            <Button onClick={exportCsv} size="sm" variant="outline" className="h-8 text-xs"><Download className="h-3.5 w-3.5 mr-1" /> Export CSV</Button>
          </div>
          <div className="rounded-2xl border bg-white p-3 mb-2 flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs w-36" />
            </div>
            {(from || to) && (
              <Button onClick={() => { setFrom(""); setTo(""); }} variant="ghost" size="sm" className="h-8 text-xs">Clear</Button>
            )}
            <div className="ml-auto flex gap-3 text-[11px]">
              <span className="text-emerald-700 font-semibold">+{totals.earned.toLocaleString()} earned</span>
              <span className="text-rose-700 font-semibold">−{totals.spent.toLocaleString()} spent</span>
            </div>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground rounded-2xl border bg-white">No activity in this range.</div>
          ) : (
            <div className="rounded-2xl border bg-white overflow-hidden divide-y">
              {ledger.map((l) => {
                const meta = SOURCE_META[l.source] ?? { label: l.source, Icon: Sparkles, color: "text-zinc-700 bg-zinc-100" };
                const pos = l.delta > 0;
                const exp = l.expires_at ? new Date(l.expires_at) : null;
                const expiresSoon = exp && exp.getTime() - Date.now() < 30 * 86400000 && exp.getTime() > Date.now();
                return (
                  <div key={l.id} className="flex items-center gap-3 p-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.color}`}>
                      <meta.Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">{meta.label}</div>
                      <div className="text-[11px] text-zinc-500">
                        {new Date(l.created_at).toLocaleString()}
                        {exp && <> · expires {exp.toLocaleDateString()}{expiresSoon && <span className="text-amber-700 font-semibold"> (soon)</span>}</>}
                      </div>
                    </div>
                    <div className={`text-sm font-bold inline-flex items-center gap-0.5 ${pos ? "text-emerald-700" : "text-rose-700"}`}>
                      {pos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                      {pos ? "+" : ""}{l.delta} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Earn({ Icon, label, pts }: { Icon: any; label: string; pts: number | string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur p-2 border border-white/10">
      <Icon className="h-3.5 w-3.5 mx-auto opacity-90" />
      <div className="mt-1 font-semibold">{typeof pts === "number" ? `+${pts}` : pts}</div>
      <div className="opacity-70 text-[10px] truncate">{label}</div>
    </div>
  );
}
