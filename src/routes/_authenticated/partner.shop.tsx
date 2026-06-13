import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling } from "@/lib/queries/billing";
import {
  usePartnerShops,
  useDeletePartnerShop,
  getStoredPartnerShopId,
  setStoredPartnerShopId,
} from "@/lib/queries/partner";
import { PartnerShopSelect } from "@/components/app/partner/PartnerShopSelect";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Camera,
  ImagePlus,
  Loader2,
  MapPin,
  Navigation,
  Save,
  Store,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { PARTNER_BTN, PartnerEmptyState, PartnerStatusPill } from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/shop")({
  head: () => ({ meta: [{ title: "Shop profile · Partner" }] }),
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
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  logo_url: string | null;
  gallery_urls: string[];
  tags: string[];
  amenities: string[];
  free_coffee_available: boolean;
  price_level: number;
  status: string;
};

const SIGNED_TTL = 60 * 60 * 24 * 365;

const EMPTY_SHOP = (): Shop => ({
  id: "",
  name: "",
  slug: "",
  description: "",
  address: "",
  city: "",
  country: "",
  latitude: null,
  longitude: null,
  cover_image_url: null,
  logo_url: null,
  gallery_urls: [],
  tags: [],
  amenities: [],
  free_coffee_available: false,
  price_level: 2,
  status: "pending",
});

function ShopProfilePage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);
  const { data: shopList = [], isLoading: shopsLoading, refetch: refetchShops } = usePartnerShops(user?.id);
  const deleteShop = useDeletePartnerShop();
  const canAddShop = billing?.hasProPlan || !billing?.totalShops;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [activeShopId, setActiveShopId] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [amenityInput, setAmenityInput] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    setUserId(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (shopsLoading) return;
    if (creatingNew) {
      setLoading(false);
      return;
    }
    if (shopList.length === 0) {
      setShop(null);
      setLoading(false);
      return;
    }
    const stored = getStoredPartnerShopId();
    const id = shopList.some((s) => s.id === stored) ? stored! : shopList[0].id;
    if (id !== activeShopId) setActiveShopId(id);
  }, [shopsLoading, shopList, creatingNew, activeShopId]);

  useEffect(() => {
    if (creatingNew || !activeShopId) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("coffee_shops").select("*").eq("id", activeShopId).maybeSingle();
      if (data) setShop(data as Shop);
      setLoading(false);
    })();
  }, [activeShopId, creatingNew]);

  async function save() {
    if (!shop) return;
    setSaving(true);
    const patch = {
      name: shop.name,
      description: shop.description,
      address: shop.address,
      city: shop.city,
      country: shop.country,
      latitude: shop.latitude,
      longitude: shop.longitude,
      cover_image_url: shop.cover_image_url,
      logo_url: shop.logo_url,
      gallery_urls: shop.gallery_urls,
      tags: shop.tags,
      amenities: shop.amenities,
      free_coffee_available: shop.free_coffee_available,
      price_level: shop.price_level,
    };
    if (shop.id) {
      const { error } = await supabase.from("coffee_shops").update(patch).eq("id", shop.id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
    } else {
      if (!canAddShop) {
        toast.error("Free plan allows 1 listing. Upgrade to Pro for multiple locations.");
        setSaving(false);
        return;
      }
      const slug =
        (shop.name || "shop").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase
        .from("coffee_shops")
        .insert({ ...patch, slug, partner_id: userId, status: "pending" })
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      setCreatingNew(false);
      setStoredPartnerShopId(data.id);
      setActiveShopId(data.id);
      void refetchShops();
    }
    toast.success("Profile saved");
    setSaving(false);
  }

  async function removeShop() {
    if (!shop?.id) return;
    if (!confirm(`Delete "${shop.name}"? End active campaigns first. This cannot be undone.`)) return;
    try {
      await deleteShop.mutateAsync(shop.id);
      toast.success("Shop deleted");
      setStoredPartnerShopId("");
      setActiveShopId("");
      setShop(null);
      setCreatingNew(false);
      void refetchShops();
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not delete shop");
    }
  }

  function startNewShop() {
    if (!canAddShop) {
      toast.error("Free plan allows 1 listing. Upgrade to Pro for multiple locations.");
      return;
    }
    setCreatingNew(true);
    setActiveShopId("");
    setShop(EMPTY_SHOP());
  }

  function selectShop(id: string) {
    setCreatingNew(false);
    setActiveShopId(id);
    setStoredPartnerShopId(id);
  }

  async function uploadImage(file: File, kind: "cover" | "logo" | "gallery") {
    if (!userId) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("shop-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const { data: signed } = await supabase.storage.from("shop-images").createSignedUrl(path, SIGNED_TTL);
    const url = signed?.signedUrl;
    if (!url || !shop) return;
    if (kind === "cover") setShop({ ...shop, cover_image_url: url });
    else if (kind === "logo") setShop({ ...shop, logo_url: url });
    else setShop({ ...shop, gallery_urls: [...(shop.gallery_urls ?? []), url] });
    toast.success("Image uploaded. Remember to save");
  }

  function useMyLocation() {
    if (!shop || !navigator.geolocation) {
      toast.error("Location not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setShop({
          ...shop,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
        toast.success("Location captured");
      },
      () => {
        setLocating(false);
        toast.error("Could not get GPS location");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  if (loading || shopsLoading) {
    return (
      <AppPage>
        <AppPageHeader eyebrow={t("pages.partnerShop.eyebrow")} title={t("pages.partnerShop.title")} />
        <AppPageBody className="pb-10">
          <div className="cofex-app-card h-64 animate-pulse bg-[color:var(--cofex-cream)]" />
        </AppPageBody>
      </AppPage>
    );
  }

  if (!shop && !creatingNew) {
    return (
      <AppPage>
        <AppPageHeader
          eyebrow={t("pages.partnerShop.eyebrow")}
          title={t("pages.partnerShop.title")}
          subtitle={t("pages.partnerShop.editSubtitle")}
          action={
            canAddShop ? (
              <Button className={PARTNER_BTN} onClick={startNewShop}>
                <Plus className="mr-1 h-4 w-4" /> Add location
              </Button>
            ) : undefined
          }
        />
        <AppPageBody className="max-w-2xl pb-10">
          <PartnerEmptyState
            Icon={Store}
            title="Create your café profile"
            description="Photos, story, location, and amenities. Explorers need GPS coordinates to check in."
            action={
              <Button className={`mt-4 ${PARTNER_BTN}`} onClick={startNewShop}>
                <Plus className="mr-1 h-4 w-4" /> Start setup
              </Button>
            }
          />
        </AppPageBody>
      </AppPage>
    );
  }

  if (!shop) {
    return (
      <AppPage>
        <AppPageHeader eyebrow={t("pages.partnerShop.eyebrow")} title={t("pages.partnerShop.title")} />
        <AppPageBody className="pb-10">
          <div className="cofex-app-card h-64 animate-pulse bg-[color:var(--cofex-cream)]" />
        </AppPageBody>
      </AppPage>
    );
  }

  const hasCoords = shop.latitude != null && shop.longitude != null;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerShop.eyebrow")}
        title={creatingNew ? t("pages.partnerShop.newLocation") : t("pages.partnerShop.title")}
        subtitle={creatingNew ? t("pages.partnerShop.createSubtitle") : t("pages.partnerShop.viewSubtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {shopList.length > 0 && !creatingNew && (
              <PartnerShopSelect value={activeShopId} onChange={selectShop} />
            )}
            {canAddShop && !creatingNew && (
              <Button type="button" variant="outline" className="rounded-full" onClick={startNewShop}>
                <Plus className="mr-1 h-4 w-4" /> Add location
              </Button>
            )}
            <Button onClick={save} disabled={saving} className={PARTNER_BTN}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        }
      />
      <AppPageBody className="max-w-5xl space-y-6 pb-10">
        <div className="flex flex-wrap items-center gap-2">
          <PartnerStatusPill tone={shop.status === "active" ? "success" : "warn"}>{shop.status}</PartnerStatusPill>
          {!hasCoords && (
            <PartnerStatusPill tone="danger">GPS required for check-ins</PartnerStatusPill>
          )}
        </div>

        <CoverCard
          shop={shop}
          onUpload={(f) => uploadImage(f, "cover")}
          onLogo={(f) => uploadImage(f, "logo")}
          onClearCover={() => setShop({ ...shop, cover_image_url: null })}
        />

        <Section title="Basics">
          <Field label="Café name">
            <Input value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} />
          </Field>
          <Field label="Short story">
            <Textarea
              rows={4}
              value={shop.description ?? ""}
              onChange={(e) => setShop({ ...shop, description: e.target.value })}
              placeholder="Tell explorers what makes this café special."
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Address">
              <Input value={shop.address ?? ""} onChange={(e) => setShop({ ...shop, address: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={shop.city ?? ""} onChange={(e) => setShop({ ...shop, city: e.target.value })} />
            </Field>
            <Field label="Country">
              <Input value={shop.country ?? ""} onChange={(e) => setShop({ ...shop, country: e.target.value })} />
            </Field>
          </div>
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <Field label="Price level">
              <select
                value={shop.price_level}
                onChange={(e) => setShop({ ...shop, price_level: Number(e.target.value) })}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {"$".repeat(n)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="cofex-app-card flex items-center justify-between rounded-xl p-3 shadow-none">
              <div>
                <div className="text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">Free CO:FE(X) coffee</div>
                <div className="text-xs text-[color:var(--cofex-black)]/55">Participate in the free-coffee giveaway.</div>
              </div>
              <Switch
                checked={shop.free_coffee_available}
                onCheckedChange={(v) => setShop({ ...shop, free_coffee_available: v })}
              />
            </div>
          </div>
        </Section>

        <Section
          title="Map location"
          right={
            <Button type="button" variant="outline" size="sm" className="rounded-full" disabled={locating} onClick={useMyLocation}>
              {locating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Navigation className="mr-1 h-3.5 w-3.5" />}
              Use my location
            </Button>
          }
        >
          <p className="text-sm text-[color:var(--cofex-black)]/65">
            Explorers must be within 200 m to check in. Set coordinates at your café entrance.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitude">
              <Input
                type="number"
                step="any"
                value={shop.latitude ?? ""}
                onChange={(e) =>
                  setShop({ ...shop, latitude: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="e.g. 38.7139"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step="any"
                value={shop.longitude ?? ""}
                onChange={(e) =>
                  setShop({ ...shop, longitude: e.target.value ? Number(e.target.value) : null })
                }
                placeholder="e.g. -9.1394"
              />
            </Field>
          </div>
        </Section>

        <Section title="Photo gallery" right={<UploadBtn label="Add photo" onFile={(f) => uploadImage(f, "gallery")} />}>
          {shop.gallery_urls?.length === 0 ? (
            <div className="cofex-app-card cofex-app-card-dashed p-8 text-center text-sm text-[color:var(--cofex-black)]/55 shadow-none">
              <ImagePlus className="mx-auto mb-1 h-6 w-6 opacity-50" />
              Add 3–8 high-quality photos so explorers can fall in love with your café.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {shop.gallery_urls.map((u, i) => (
                <div key={u + i} className="group relative aspect-square overflow-hidden rounded-xl border">
                  <img src={u} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setShop({ ...shop, gallery_urls: shop.gallery_urls.filter((_, j) => j !== i) })}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Tags & amenities">
          <ChipEditor
            label="Tags"
            value={tagInput}
            setValue={setTagInput}
            items={shop.tags}
            onChange={(v) => setShop({ ...shop, tags: v })}
            placeholder="specialty, vegan, latte-art"
          />
          <ChipEditor
            label="Amenities"
            value={amenityInput}
            setValue={setAmenityInput}
            items={shop.amenities}
            onChange={(v) => setShop({ ...shop, amenities: v })}
            placeholder="wifi, outdoor seating, pet friendly"
          />
        </Section>

        {shop.id && shopList.length > 0 && (
          <div className="cofex-app-card border-rose-200 bg-rose-50/50 p-5">
            <h3 className="font-extrabold text-rose-900">Delete location</h3>
            <p className="mt-1 text-sm text-rose-900/75">
              Remove this café from CO:FE(X). End or pause active campaigns first.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 rounded-full border-rose-300 text-rose-800 hover:bg-rose-100"
              disabled={deleteShop.isPending}
              onClick={() => void removeShop()}
            >
              {deleteShop.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              Delete this shop
            </Button>
          </div>
        )}
      </AppPageBody>
    </AppPage>
  );
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="cofex-app-card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--cofex-black)]/45">{label}</Label>
      {children}
    </div>
  );
}

function CoverCard({
  shop,
  onUpload,
  onLogo,
  onClearCover,
}: {
  shop: Shop;
  onUpload: (f: File) => void;
  onLogo: (f: File) => void;
  onClearCover: () => void;
}) {
  return (
    <div className="cofex-app-card overflow-hidden p-0">
      <div className="relative h-56 bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)] sm:h-72">
        {shop.cover_image_url ? (
          <img src={shop.cover_image_url} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[color:var(--cofex-coffee-deep)]">
            <Camera className="mb-1 h-8 w-8" />
            <span className="text-sm">Add a cover photo</span>
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <UploadBtn label={shop.cover_image_url ? "Replace cover" : "Upload cover"} onFile={onUpload} />
          {shop.cover_image_url && (
            <button
              onClick={onClearCover}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-black/60 px-3 text-xs text-white"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        <div className="absolute -bottom-8 left-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
          {shop.logo_url ? (
            <img src={shop.logo_url} alt="logo" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-7 w-7 text-[color:var(--cofex-coffee-deep)]" />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4 pt-10">
        <div className="min-w-0">
          <div className="truncate font-bold text-[color:var(--cofex-coffee-deep)]">{shop.name || "Untitled café"}</div>
          <div className="flex items-center gap-1 text-xs text-[color:var(--cofex-black)]/55">
            <MapPin className="h-3 w-3" />
            {[shop.city, shop.country].filter(Boolean).join(", ") || "Add a location"}
          </div>
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
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.currentTarget.value = "";
        }}
      />
      <button
        onClick={() => ref.current?.click()}
        className={`inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold ${
          variant === "outline"
            ? "border bg-white hover:bg-[color:var(--cofex-cream)]"
            : `${PARTNER_BTN}`
        }`}
      >
        <ImagePlus className="h-3.5 w-3.5" /> {label}
      </button>
    </>
  );
}

function ChipEditor({
  label,
  value,
  setValue,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  function add() {
    const t = value.trim().toLowerCase();
    if (!t) return;
    if (!items.includes(t)) onChange([...items, t]);
    setValue("");
  }
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {items.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-[color:var(--cofex-pastel-blue)] bg-[color:var(--cofex-pastel-blue)]/40 px-2 py-1 text-xs text-[color:var(--cofex-coffee-deep)]"
            >
              {t}
              <button onClick={() => onChange(items.filter((x) => x !== t))} className="hover:opacity-70">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
