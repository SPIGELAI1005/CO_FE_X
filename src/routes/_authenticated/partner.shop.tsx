import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling } from "@/lib/queries/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Camera, ImagePlus, Loader2, MapPin, Save, Store, Trash2, X, Plus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/shop")({
  head: () => ({ meta: [{ title: "Shop profile — Partner" }] }),
  component: ShopProfilePage,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  tags: string[];
  amenities: string[];
  free_coffee_available: boolean;
  price_level: number;
  status: string;
};

const SIGNED_TTL = 60 * 60 * 24 * 365; // 1 year

function ShopProfilePage() {
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);
  const canAddShop = billing?.hasProPlan || !billing?.totalShops;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [amenityInput, setAmenityInput] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      setUserId(user.id);
      const { data } = await supabase
        .from("coffee_shops").select("*").eq("partner_id", user.id)
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (data) setShop(data as Shop);
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!shop) return;
    setSaving(true);
    const patch = {
      name: shop.name, description: shop.description, address: shop.address,
      city: shop.city, country: shop.country, cover_image_url: shop.cover_image_url,
      logo_url: shop.logo_url, gallery_urls: shop.gallery_urls, tags: shop.tags,
      amenities: shop.amenities, free_coffee_available: shop.free_coffee_available,
      price_level: shop.price_level,
    };
    if (shop.id) {
      const { error } = await supabase.from("coffee_shops").update(patch).eq("id", shop.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      if (!canAddShop) {
        toast.error("Free plan allows 1 listing. Upgrade to Pro for multiple locations.");
        setSaving(false);
        return;
      }
      const slug = (shop.name || "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase.from("coffee_shops").insert({ ...patch, slug, partner_id: userId, status: "pending" }).select("*").single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setShop(data as Shop);
    }
    toast.success("Profile saved");
    setSaving(false);
  }

  async function uploadImage(file: File, kind: "cover" | "logo" | "gallery") {
    if (!userId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("shop-images").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("shop-images").createSignedUrl(path, SIGNED_TTL);
    const url = signed?.signedUrl;
    if (!url || !shop) return;
    if (kind === "cover") setShop({ ...shop, cover_image_url: url });
    else if (kind === "logo") setShop({ ...shop, logo_url: url });
    else setShop({ ...shop, gallery_urls: [...(shop.gallery_urls ?? []), url] });
    toast.success("Image uploaded — remember to save");
  }

  if (loading) return <div className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Loading…</div>;

  if (!shop) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <Store className="h-10 w-10 mx-auto text-amber-700 mb-3" />
          <h3 className="font-semibold">Create your café profile</h3>
          <p className="text-sm text-muted-foreground mb-4">Tell explorers about your shop. You can refine images, hours and amenities later.</p>
          <Button onClick={() => setShop({
            id: "", name: "", slug: "", description: "", address: "", city: "", country: "",
            cover_image_url: null, logo_url: null, gallery_urls: [], tags: [], amenities: [],
            free_coffee_available: false, price_level: 2, status: "pending",
          })} className="bg-amber-700 hover:bg-amber-800"><Plus className="h-4 w-4 mr-1" /> Start setup</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Listing</div>
          <h1 className="text-3xl font-serif font-bold mt-1">Your café profile</h1>
          <p className="text-sm text-muted-foreground">Status: <span className="capitalize font-medium text-zinc-700">{shop.status}</span></p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-amber-700 hover:bg-amber-800">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save changes
        </Button>
      </div>

      <CoverCard shop={shop} onUpload={(f) => uploadImage(f, "cover")} onLogo={(f) => uploadImage(f, "logo")} onClearCover={() => setShop({ ...shop, cover_image_url: null })} />

      <Section title="Basics">
        <Field label="Café name"><Input value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} /></Field>
        <Field label="Short story"><Textarea rows={4} value={shop.description ?? ""} onChange={(e) => setShop({ ...shop, description: e.target.value })} placeholder="Tell explorers what makes this café special." /></Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Address"><Input value={shop.address ?? ""} onChange={(e) => setShop({ ...shop, address: e.target.value })} /></Field>
          <Field label="City"><Input value={shop.city ?? ""} onChange={(e) => setShop({ ...shop, city: e.target.value })} /></Field>
          <Field label="Country"><Input value={shop.country ?? ""} onChange={(e) => setShop({ ...shop, country: e.target.value })} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 items-center">
          <Field label="Price level">
            <select value={shop.price_level} onChange={(e) => setShop({ ...shop, price_level: Number(e.target.value) })} className="h-10 px-3 rounded-md border bg-white text-sm w-full">
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{"$".repeat(n)}</option>)}
            </select>
          </Field>
          <div className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <div className="text-sm font-medium">Free CO:FE(X) coffee</div>
              <div className="text-xs text-muted-foreground">Mark if you participate in the free-coffee giveaway.</div>
            </div>
            <Switch checked={shop.free_coffee_available} onCheckedChange={(v) => setShop({ ...shop, free_coffee_available: v })} />
          </div>
        </div>
      </Section>

      <Section title="Photo gallery" right={<UploadBtn label="Add photo" onFile={(f) => uploadImage(f, "gallery")} />}>
        {shop.gallery_urls?.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <ImagePlus className="h-6 w-6 mx-auto mb-1 opacity-50" />
            Add 3–8 high-quality photos so explorers can fall in love with your café.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {shop.gallery_urls.map((u, i) => (
              <div key={u + i} className="relative aspect-square rounded-xl overflow-hidden border group">
                <img src={u} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setShop({ ...shop, gallery_urls: shop.gallery_urls.filter((_, j) => j !== i) })}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Tags & amenities">
        <ChipEditor label="Tags" value={tagInput} setValue={setTagInput} items={shop.tags} onChange={(v) => setShop({ ...shop, tags: v })} placeholder="specialty, vegan, latte-art" />
        <ChipEditor label="Amenities" value={amenityInput} setValue={setAmenityInput} items={shop.amenities} onChange={(v) => setShop({ ...shop, amenities: v })} placeholder="wifi, outdoor seating, pet friendly" />
      </Section>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-zinc-500">{label}</Label>{children}</div>;
}

function CoverCard({ shop, onUpload, onLogo, onClearCover }: { shop: Shop; onUpload: (f: File) => void; onLogo: (f: File) => void; onClearCover: () => void }) {
  return (
    <div className="rounded-2xl border bg-white overflow-hidden">
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-amber-50 to-orange-100">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-amber-800">
            <Camera className="h-8 w-8 mb-1" /><span className="text-sm">Add a cover photo</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <UploadBtn label={shop.cover_image_url ? "Replace cover" : "Upload cover"} onFile={onUpload} />
          {shop.cover_image_url && (
            <button onClick={onClearCover} className="h-9 px-3 rounded-full bg-black/60 text-white text-xs flex items-center gap-1"><X className="h-3.5 w-3.5" /> Remove</button>
          )}
        </div>
        <div className="absolute -bottom-8 left-5 h-20 w-20 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
          {shop.logo_url ? <img src={shop.logo_url} alt="logo" className="w-full h-full object-cover" /> : <Store className="h-7 w-7 text-amber-700" />}
        </div>
      </div>
      <div className="pt-10 pl-5 pr-5 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{shop.name || "Untitled café"}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {[shop.city, shop.country].filter(Boolean).join(", ") || "Add a location"}</div>
        </div>
        <UploadBtn label={shop.logo_url ? "Replace logo" : "Upload logo"} onFile={onLogo} variant="outline" />
      </div>
    </div>
  );
}

function UploadBtn({ label, onFile, variant }: { label: string; onFile: (f: File) => void; variant?: "outline" }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
      <button onClick={() => ref.current?.click()}
        className={`h-9 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1 ${variant === "outline" ? "border bg-white hover:bg-zinc-50" : "bg-amber-700 text-white hover:bg-amber-800"}`}>
        <ImagePlus className="h-3.5 w-3.5" /> {label}
      </button>
    </>
  );
}

function ChipEditor({ label, value, setValue, items, onChange, placeholder }: { label: string; value: string; setValue: (v: string) => void; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  function add() {
    const t = value.trim().toLowerCase(); if (!t) return;
    if (!items.includes(t)) onChange([...items, t]);
    setValue("");
  }
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1">
              {t}
              <button onClick={() => onChange(items.filter((x) => x !== t))} className="hover:text-amber-900"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
