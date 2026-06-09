import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Coffee, Sparkles, Gift, Users, Copy, Check, ArrowDownLeft, ArrowUpRight, Wallet, Megaphone, Share2, MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_explorer/wallet")({
  head: () => ({ meta: [{ title: "Wallet — CO:FE(X)" }] }),
  component: WalletPage,
});

type Ledger = { id: string; delta: number; balance_after: number; source: string; metadata: any; created_at: string };
type CatalogItem = { id: string; name: string; description: string | null; cost_points: number; emoji: string | null; tier: string | null };
type Redemption = { id: string; catalog_id: string; points_spent: number; redemption_code: string; used_at: string | null; created_at: string };

const SOURCE_META: Record<string, { label: string; Icon: any; color: string }> = {
  check_in: { label: "Check-in", Icon: Coffee, color: "text-amber-700 bg-amber-50" },
  review: { label: "Review", Icon: MessageSquareText, color: "text-blue-700 bg-blue-50" },
  campaign_redemption: { label: "Campaign", Icon: Megaphone, color: "text-fuchsia-700 bg-fuchsia-50" },
  social_post: { label: "Social post", Icon: Share2, color: "text-rose-700 bg-rose-50" },
  referral_bonus: { label: "Referral bonus", Icon: Users, color: "text-emerald-700 bg-emerald-50" },
  referral_reward: { label: "Referral reward", Icon: Users, color: "text-emerald-700 bg-emerald-50" },
  catalog_redemption: { label: "Reward redeemed", Icon: Gift, color: "text-zinc-700 bg-zinc-100" },
};

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

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: led }, { data: cat }, { data: red }] = await Promise.all([
      supabase.from("profiles").select("total_points, referral_code, referred_by").eq("id", user.id).maybeSingle() as any,
      (supabase as any).from("points_ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(40),
      (supabase as any).from("reward_catalog").select("*").eq("active", true).order("sort_order"),
      (supabase as any).from("catalog_redemptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setBalance(prof?.total_points ?? 0);
    setRefCode(prof?.referral_code ?? null);
    setReferredBy(prof?.referred_by ?? null);
    setLedger((led as Ledger[]) ?? []);
    setCatalog((cat as CatalogItem[]) ?? []);
    setRedemptions((red as Redemption[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function redeem(item: CatalogItem) {
    if (balance < item.cost_points) return toast.error(`Need ${item.cost_points - balance} more points`);
    setBusyId(item.id);
    const { data, error } = await (supabase as any).rpc("redeem_catalog_item", { _item_id: item.id });
    setBusyId(null);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(`Reward unlocked: ${data.item}`);
    load();
  }

  async function claim() {
    if (!claimInput.trim()) return;
    const { error } = await (supabase as any).rpc("claim_referral", { _code: claimInput.trim() });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success("Referral claimed! +50 points");
    setClaimInput("");
    load();
  }

  function copyCode() {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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

        {/* Active vouchers */}
        {redemptions.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-zinc-900 mb-2">Your reward codes</h2>
            <div className="space-y-2">
              {redemptions.map((r) => {
                const item = catalog.find((c) => c.id === r.catalog_id);
                return (
                  <div key={r.id} className={`rounded-xl border p-3 flex items-center justify-between ${r.used_at ? "bg-zinc-50 opacity-70" : "bg-white border-amber-300"}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{item?.name ?? "Reward"}</div>
                      <div className="text-[11px] text-zinc-500">{r.used_at ? `Redeemed ${new Date(r.used_at).toLocaleDateString()}` : "Show at any partner café"}</div>
                    </div>
                    <div className="font-mono text-sm tracking-[0.25em] font-bold text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">{r.redemption_code}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
          <h2 className="text-sm font-bold text-zinc-900 mb-2 inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-amber-700" /> Recent activity</h2>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : ledger.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground rounded-2xl border bg-white">Check in at a café to start earning.</div>
          ) : (
            <div className="rounded-2xl border bg-white overflow-hidden divide-y">
              {ledger.map((l) => {
                const meta = SOURCE_META[l.source] ?? { label: l.source, Icon: Sparkles, color: "text-zinc-700 bg-zinc-100" };
                const pos = l.delta > 0;
                return (
                  <div key={l.id} className="flex items-center gap-3 p-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${meta.color}`}>
                      <meta.Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">{meta.label}</div>
                      <div className="text-[11px] text-zinc-500">{new Date(l.created_at).toLocaleString()}</div>
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
