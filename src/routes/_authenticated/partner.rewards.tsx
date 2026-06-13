import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Coffee, Gift, Loader2, Plus, Trash2, Save, X } from "lucide-react";
import { PARTNER_BTN, PartnerEmptyState } from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/rewards")({
  head: () => ({ meta: [{ title: "Rewards · Partner" }] }),
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: s } = await supabase.from("coffee_shops").select("id, name").eq("partner_id", user.id);
    const sh = (s ?? []) as { id: string; name: string }[];
    setShops(sh);
    const sid = activeShop ?? sh[0]?.id ?? "";
    setShopId(sid);
    if (!sid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: r } = await supabase
      .from("rewards")
      .select("*")
      .eq("coffee_shop_id", sid)
      .order("cost_points", { ascending: true });
    setItems((r ?? []) as Reward[]);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

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
    <AppPage>
      <AppPageHeader
        eyebrow="Rewards"
        title="Reward catalog"
        subtitle="Set what explorers can redeem with CO:FE(X) points at your café."
        action={
          <div className="flex items-center gap-2">
            {shops.length > 1 && (
              <select
                value={shopId}
                onChange={(e) => load(e.target.value)}
                className="h-10 rounded-full border bg-white px-3 text-sm"
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={() => setOpen(true)} disabled={!shopId} className={PARTNER_BTN}>
              <Plus className="mr-1 h-4 w-4" /> New reward
            </Button>
          </div>
        }
      />
      <AppPageBody className="max-w-5xl pb-10">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cofex-app-card h-28 animate-pulse bg-[color:var(--cofex-cream)]" />
            ))}
          </div>
        ) : !shopId ? (
          <PartnerEmptyState
            Icon={Coffee}
            title="Add your café first"
            description="You need a café profile before creating a points reward catalog."
            to="/partner/shop"
            actionLabel="Set up shop"
          />
        ) : items.length === 0 ? (
          <PartnerEmptyState
            Icon={Gift}
            title="No rewards yet"
            description="Start with a few tiers, e.g. Espresso (100), Cappuccino (300), Premium (500)."
            action={
              <Button className={`mt-4 ${PARTNER_BTN}`} onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Create reward
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((r) => (
              <div key={r.id} className="cofex-app-card flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{r.title}</div>
                    {r.description && (
                      <div className="line-clamp-2 text-sm text-[color:var(--cofex-black)]/65">{r.description}</div>
                    )}
                  </div>
                  <button onClick={() => remove(r)} className="text-[color:var(--cofex-black)]/30 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--cofex-pastel-blue)] bg-[color:var(--cofex-pastel-blue)]/40 px-2 py-1 text-xs font-bold text-[color:var(--cofex-coffee-deep)]">
                    <Gift className="h-3 w-3" /> {r.cost_points} pts
                  </span>
                  <label className="flex items-center gap-2 text-xs text-[color:var(--cofex-black)]/55">
                    <span>{r.active ? "Live" : "Hidden"}</span>
                    <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {open && shopId && <RewardModal shopId={shopId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(shopId); }} />}
      </AppPageBody>
    </AppPage>
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
      coffee_shop_id: shopId,
      title: title.trim(),
      description: description.trim() || null,
      cost_points: cost,
      active: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reward created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="cofex-app-card w-full max-w-md space-y-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">New reward</h3>
          <button onClick={onClose} className="text-[color:var(--cofex-black)]/35 hover:text-[color:var(--cofex-black)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Free Espresso" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Single shot, any espresso-based drink." />
          </div>
          <div className="space-y-1.5">
            <Label>Cost (CO:FE(X) points)</Label>
            <Input type="number" min={1} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </div>
          <div className="flex flex-wrap gap-1">
            {[100, 300, 500].map((p) => (
              <button
                key={p}
                onClick={() => setCost(p)}
                className="rounded-full bg-[color:var(--cofex-cream)] px-2 py-1 text-[11px] hover:bg-[color:var(--cofex-pastel-blue)]/40"
              >
                {p} pts
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="rounded-full">
            Cancel
          </Button>
          <Button onClick={save} disabled={busy} className={PARTNER_BTN}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
          </Button>
        </div>
      </div>
    </div>
  );
}
