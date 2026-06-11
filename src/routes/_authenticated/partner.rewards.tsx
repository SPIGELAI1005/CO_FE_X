import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Coffee, Gift, Loader2, Plus, Trash2, Save, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/rewards")({
  head: () => ({ meta: [{ title: "Rewards — Partner" }] }),
  component: RewardsPage,
});

type Reward = {
  id: string;
  coffee_shop_id: string;
  title: string;
  description: string | null;
  cost_points: number;
  active: boolean;
};

function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [items, setItems] = useState<Reward[]>([]);
  const [open, setOpen] = useState(false);

  async function load(activeShop?: string) {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: s } = await supabase.from("coffee_shops").select("id, name").eq("partner_id", user.id);
    const sh = (s ?? []) as { id: string; name: string }[];
    setShops(sh);
    const sid = activeShop ?? sh[0]?.id ?? "";
    setShopId(sid);
    if (!sid) { setItems([]); setLoading(false); return; }
    const { data: r } = await supabase.from("rewards").select("*").eq("coffee_shop_id", sid).order("cost_points", { ascending: true });
    setItems((r ?? []) as Reward[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(r: Reward, active: boolean) {
    const { error } = await supabase.from("rewards").update({ active }).eq("id", r.id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.map((x) => (x.id === r.id ? { ...x, active } : x)));
  }
  async function remove(r: Reward) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from("rewards").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.filter((x) => x.id !== r.id));
    toast.success("Reward deleted");
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Rewards</div>
          <h1 className="text-3xl font-serif font-bold mt-1">Reward catalog</h1>
          <p className="text-sm text-muted-foreground">Set what explorers can redeem with CO:FE(X) points at your café.</p>
        </div>
        <div className="flex items-center gap-2">
          {shops.length > 1 && (
            <select value={shopId} onChange={(e) => load(e.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm">
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          <Button onClick={() => setOpen(true)} className="bg-amber-700 hover:bg-amber-800" disabled={!shopId}>
            <Plus className="h-4 w-4 mr-1" /> New reward
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-zinc-100 animate-pulse" />)}
        </div>
      ) : !shopId ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Coffee className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">Add your café first</h3>
          <p className="text-sm text-muted-foreground">You need a café profile before creating rewards.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Gift className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">No rewards yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Start with a few tiers — e.g. Espresso (100), Cappuccino (300), Premium (500).</p>
          <Button onClick={() => setOpen(true)} className="bg-amber-700 hover:bg-amber-800"><Plus className="h-4 w-4 mr-1" /> Create reward</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-white p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{r.title}</div>
                  {r.description && <div className="text-sm text-muted-foreground line-clamp-2">{r.description}</div>}
                </div>
                <button onClick={() => remove(r)} className="text-zinc-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  <Gift className="h-3 w-3" /> {r.cost_points} pts
                </span>
                <label className="flex items-center gap-2 text-xs text-zinc-600">
                  <span>{r.active ? "Live" : "Hidden"}</span>
                  <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && shopId && <RewardModal shopId={shopId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(shopId); }} />}
    </div>
  );
}

function RewardModal({ shopId, onClose, onSaved }: { shopId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState(100);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    if (cost < 1) return toast.error("Cost must be at least 1 point");
    setBusy(true);
    const { error } = await supabase.from("rewards").insert({
      coffee_shop_id: shopId, title: title.trim(), description: description.trim() || null,
      cost_points: cost, active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reward created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">New reward</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Free Espresso" /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Single shot, any espresso-based drink." /></div>
          <div className="space-y-1.5"><Label>Cost (CO:FE(X) points)</Label><Input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} /></div>
          <div className="flex flex-wrap gap-1">
            {[100, 300, 500].map((p) => (
              <button key={p} onClick={() => setCost(p)} className="text-[11px] px-2 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200">{p} pts</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="bg-amber-700 hover:bg-amber-800">
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}
