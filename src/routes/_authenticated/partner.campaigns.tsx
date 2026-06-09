import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CampaignWizard } from "@/components/app/CampaignWizard";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus, Users, Gift, Calendar, Hash, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partner/campaigns")({
  component: PartnerCampaignsPage,
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
  campaign_type: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  coffee_shop_id: string;
  participant_count?: number;
};

function PartnerCampaignsPage() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: shops } = await supabase.from("coffee_shops").select("id").eq("partner_id", user.id);
    const ids = (shops ?? []).map((s) => s.id);
    if (ids.length === 0) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .in("coffee_shop_id", ids)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Campaign[];
    if (rows.length) {
      const { data: counts } = await supabase
        .from("check_ins")
        .select("campaign_id")
        .in("campaign_id", rows.map((r) => r.id));
      const map = new Map<string, number>();
      for (const r of counts ?? []) {
        if (!r.campaign_id) continue;
        map.set(r.campaign_id, (map.get(r.campaign_id) ?? 0) + 1);
      }
      rows.forEach((r) => (r.participant_count = map.get(r.id) ?? 0));
    }
    setItems(rows);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Delete this campaign?")) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-700">EEFFOC Campaigns</div>
          <h1 className="text-3xl font-serif font-bold mt-1">We Give EEFFOC</h1>
          <p className="text-sm text-muted-foreground">EEFFOC = COFFEE backwards. Launch a campaign in under a minute.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-amber-700 hover:bg-amber-800">
          <Plus className="h-4 w-4 mr-1" /> New campaign
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Megaphone className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground">Launch your first EEFFOC campaign to bring explorers in.</p>
          <Button className="mt-4 bg-amber-700 hover:bg-amber-800" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create your first campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((c) => {
            const active = c.status === "active" && (!c.ends_at || new Date(c.ends_at) > new Date());
            const full = c.max_participants ? (c.participant_count ?? 0) >= c.max_participants : false;
            return (
              <div key={c.id} className="rounded-2xl border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                        {active ? "Active" : "Ended"}
                      </span>
                      {full && <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Full</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{c.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-zinc-400 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Meta Icon={Gift} label={c.reward_description ?? "—"} />
                  <Meta Icon={Hash} label={c.hashtag ?? "—"} />
                  <Meta Icon={Users} label={`${c.participant_count ?? 0}${c.max_participants ? ` / ${c.max_participants}` : ""} joined`} />
                  <Meta Icon={Calendar} label={c.ends_at ? `Ends ${new Date(c.ends_at).toLocaleDateString()}` : "No end"} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CampaignWizard open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}

function Meta({ Icon, label }: { Icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-700">
      <Icon className="h-4 w-4 text-amber-700 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}
