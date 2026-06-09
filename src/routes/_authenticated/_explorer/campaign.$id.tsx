import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Gift, Hash, MapPin, Users, CheckCircle2, Trophy, Sparkles } from "lucide-react";
import { SocialProofSubmit } from "@/components/app/SocialProofSubmit";

export const Route = createFileRoute("/_authenticated/_explorer/campaign/$id")({
  head: () => ({ meta: [{ title: "Campaign — CO:FE(X)" }] }),
  component: CampaignDetail,
});

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  reward_description: string | null;
  requirements: string | null;
  hashtag: string | null;
  points_reward: number;
  max_participants: number | null;
  required_check_ins: number;
  campaign_type: string;
  status: string;
  ends_at: string | null;
  coffee_shop_id: string;
  cover_image_url: string | null;
  coffee_shops: { id: string; name: string; slug: string; city: string | null; cover_image_url: string | null } | null;
};

type Redemption = { redemption_code: string; redeemed_at: string; used_at: string | null; points_awarded: number };

function CampaignDetail() {
  const { id } = useParams({ from: "/_authenticated/_explorer/campaign/$id" });
  const [c, setC] = useState<Campaign | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [myCheckIns, setMyCheckIns] = useState(0);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("campaigns")
      .select("id, title, description, reward_description, requirements, hashtag, points_reward, max_participants, required_check_ins, campaign_type, status, ends_at, coffee_shop_id, cover_image_url, coffee_shops(id, name, slug, city, cover_image_url)")
      .eq("id", id)
      .maybeSingle();
    setC(data as unknown as Campaign);
    if (data) {
      const [{ count: pcount }, { data: mine }, { count: ci }, { data: red }] = await Promise.all([
        supabase.from("campaign_participants").select("id", { count: "exact", head: true }).eq("campaign_id", id),
        user ? supabase.from("campaign_participants").select("id").eq("campaign_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
        user ? supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("coffee_shop_id", (data as any).coffee_shop_id) : Promise.resolve({ count: 0 } as any),
        user ? supabase.from("campaign_redemptions").select("redemption_code, redeemed_at, used_at, points_awarded").eq("campaign_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setParticipantCount(pcount ?? 0);
      setJoined(!!mine);
      setMyCheckIns(ci ?? 0);
      setRedemption((red as any) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function join() {
    setBusy(true);
    const { error } = await supabase.rpc("join_campaign", { _campaign_id: id });
    setBusy(false);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success("You're in! Check in at the café to qualify.");
    load();
  }
  async function redeem() {
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_campaign", { _campaign_id: id });
    setBusy(false);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(`Reward unlocked! +${(data as any).points_awarded} points`);
    load();
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!c) return <div className="p-8">Campaign not found. <Link to="/campaigns" className="underline">Back</Link></div>;

  const required = Math.max(1, c.required_check_ins ?? 1);
  const progress = Math.min(100, Math.round((myCheckIns / required) * 100));
  const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
  const full = c.max_participants ? participantCount >= c.max_participants : false;
  const ended = c.ends_at ? new Date(c.ends_at) < new Date() : false;
  const qualified = myCheckIns >= required;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-rose-50 pb-16">
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-amber-200 to-orange-300">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <Link to="/campaigns" className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium shadow inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
        </Link>
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="text-xs uppercase tracking-widest opacity-80">{c.hashtag}</div>
          <h1 className="text-2xl md:text-3xl font-bold">{c.title}</h1>
          {c.coffee_shops && (
            <Link to="/coffee/$slug" params={{ slug: c.coffee_shops.slug }} className="mt-1 inline-flex items-center gap-1 text-sm opacity-90 hover:underline">
              <MapPin className="h-3.5 w-3.5" /> {c.coffee_shops.name}{c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-6 space-y-5">
        <p className="text-sm text-zinc-700 leading-relaxed">{c.description}</p>

        <div className="rounded-2xl bg-white p-5 shadow-sm border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Stat Icon={Gift} label="Reward" value={c.reward_description ?? "—"} />
            <Stat Icon={Trophy} label="Bonus points" value={`+${c.points_reward}`} />
            <Stat Icon={Users} label="Participants" value={`${participantCount}${c.max_participants ? ` / ${c.max_participants}` : ""}`} />
            <Stat Icon={Calendar} label="Ends" value={c.ends_at ? new Date(c.ends_at).toLocaleDateString() : "No end"} />
          </div>
          {c.requirements && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <div className="font-semibold mb-1 inline-flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> Requirements</div>
              {c.requirements}
            </div>
          )}
        </div>

        {redemption ? (
          <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-100 p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-amber-700" />
            <p className="mt-1 font-semibold text-amber-900">Reward unlocked!</p>
            <p className="text-xs text-amber-800 mt-1">Show this code at the counter:</p>
            <div className="mt-3 inline-block rounded-xl bg-white px-6 py-3 font-mono text-2xl tracking-[0.3em] font-bold text-amber-900 shadow">
              {redemption.redemption_code}
            </div>
            <p className="mt-3 text-xs text-amber-800">+{redemption.points_awarded} bonus points awarded</p>
            {redemption.used_at && <p className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Redeemed at counter</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm border">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Your progress</span>
              <span className="text-zinc-500">{Math.min(myCheckIns, required)} / {required} check-in{required > 1 ? "s" : ""}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-4">
              {!joined ? (
                <Button disabled={busy || full || ended} onClick={join} className="w-full bg-amber-700 hover:bg-amber-800">
                  {full ? "Campaign full" : ended ? "Campaign ended" : busy ? "Joining…" : "Join campaign"}
                </Button>
              ) : qualified ? (
                <Button disabled={busy} onClick={redeem} className="w-full bg-gradient-to-r from-amber-600 to-orange-700 text-white">
                  {busy ? "Unlocking…" : `Redeem reward (+${c.points_reward} pts)`}
                </Button>
              ) : (
                <div className="text-center text-sm text-zinc-600">
                  You're in! {c.coffee_shops && (
                    <Link to="/coffee/$slug" params={{ slug: c.coffee_shops.slug }} className="underline font-medium">
                      Visit {c.coffee_shops.name}
                    </Link>
                  )} and check in to qualify.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 inline-flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</div>
      <div className="mt-0.5 font-medium text-zinc-900 truncate">{value}</div>
    </div>
  );
}
