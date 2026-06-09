import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Map as MapIcon, List as ListIcon, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoffeeShopCard, type ShopCardData } from "@/components/app/CoffeeShopCard";

const CoffeeMap = lazy(() =>
  import("@/components/app/CoffeeMap").then((m) => ({ default: m.CoffeeMap })),
);

const TAGS = ["Espresso", "Cappuccino", "Matcha", "Specialty Coffee", "Bakery"] as const;
const AMENITIES = ["Student Friendly", "Pet Friendly", "Remote Work Friendly"] as const;

const DEFAULT_CENTER: [number, number] = [38.7139, -9.1394]; // Lisbon

type Row = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  cover_image_url: string | null;
  rating: number;
  rating_count: number;
  tags: string[];
  amenities: string[];
  free_coffee_available: boolean;
};

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const Route = createFileRoute("/_authenticated/_explorer/explore")({
  head: () => ({ meta: [{ title: "Explore — CO:FE(X)" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, { campaigns: number; popularity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"split" | "list" | "map">("split");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeAmenities, setActiveAmenities] = useState<string[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("coffee_shops")
        .select(
          "id, slug, name, city, latitude, longitude, cover_image_url, rating, rating_count, tags, amenities, free_coffee_available",
        )
        .eq("status", "approved");
      if (!mounted) return;
      if (!error && data) setRows(data as Row[]);

      const ids = (data ?? []).map((r: any) => r.id);
      if (ids.length) {
        const [{ data: camps }, { data: checks }] = await Promise.all([
          supabase
            .from("campaigns")
            .select("coffee_shop_id")
            .in("coffee_shop_id", ids)
            .eq("status", "active"),
          supabase.from("check_ins").select("coffee_shop_id, user_id").in("coffee_shop_id", ids),
        ]);
        const tally: Record<string, { campaigns: number; popularity: number }> = {};
        ids.forEach((id) => (tally[id] = { campaigns: 0, popularity: 0 }));
        (camps ?? []).forEach((c: any) => tally[c.coffee_shop_id] && (tally[c.coffee_shop_id].campaigns += 1));
        const seen: Record<string, Set<string>> = {};
        (checks ?? []).forEach((c: any) => {
          (seen[c.coffee_shop_id] ||= new Set()).add(c.user_id);
        });
        Object.entries(seen).forEach(([id, set]) => tally[id] && (tally[id].popularity = set.size));
        if (mounted) setCounts(tally);
      }
      if (mounted) setLoading(false);
    })();

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => mounted && setCenter([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: false, timeout: 4000 },
      );
    }
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const cards: ShopCardData[] = useMemo(() => {
    return rows
      .filter((r) => (freeOnly ? r.free_coffee_available : true))
      .filter((r) => (activeTags.length ? activeTags.every((t) => r.tags.includes(t)) : true))
      .filter((r) =>
        activeAmenities.length ? activeAmenities.every((a) => r.amenities.includes(a)) : true,
      )
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        city: r.city,
        cover_image_url: r.cover_image_url,
        rating: Number(r.rating),
        rating_count: r.rating_count,
        tags: r.tags,
        free_coffee_available: r.free_coffee_available,
        distance_km: haversineKm(center, [r.latitude, r.longitude]),
        active_campaigns: counts[r.id]?.campaigns ?? 0,
        popularity: counts[r.id]?.popularity ?? 0,
      }))
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [rows, counts, activeTags, activeAmenities, freeOnly, center]);

  const mapShops = useMemo(
    () =>
      cards.map((c) => {
        const r = rows.find((x) => x.id === c.id)!;
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          latitude: r.latitude,
          longitude: r.longitude,
          free_coffee_available: c.free_coffee_available,
        };
      }),
    [cards, rows],
  );

  const filterCount = activeTags.length + activeAmenities.length + (freeOnly ? 1 : 0);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col" style={{ background: "var(--cofex-cream, #f5efe6)" }}>
      {/* Filters bar */}
      <div className="border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters {filterCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{filterCount}</span>}
          </button>
          <button
            onClick={() => setFreeOnly((v) => !v)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: freeOnly ? "var(--cofex-coffee-deep, #3d2417)" : "transparent",
              color: freeOnly ? "white" : "var(--cofex-coffee-deep)",
              border: "1px solid var(--border)",
            }}
          >
            🎁 Free coffee
          </button>
          {[...TAGS, ...AMENITIES].map((t) => {
            const isTag = (TAGS as readonly string[]).includes(t);
            const active = isTag ? activeTags.includes(t) : activeAmenities.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  isTag
                    ? setActiveTags((l) => toggle(l, t))
                    : setActiveAmenities((l) => toggle(l, t))
                }
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: active ? "var(--cofex-coffee-deep, #3d2417)" : "transparent",
                  color: active ? "white" : "var(--cofex-coffee-deep)",
                  border: "1px solid var(--border)",
                }}
              >
                {t}
              </button>
            );
          })}
          {filterCount > 0 && (
            <button
              onClick={() => {
                setActiveTags([]);
                setActiveAmenities([]);
                setFreeOnly(false);
              }}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* View toggle (mobile) */}
      <div className="flex items-center justify-between px-4 py-2 md:hidden">
        <span className="text-xs text-muted-foreground">{cards.length} cafés</span>
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setView("list")}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
            style={{
              background: view !== "map" ? "var(--cofex-coffee-deep)" : "transparent",
              color: view !== "map" ? "white" : "inherit",
            }}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("map")}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
            style={{
              background: view === "map" ? "var(--cofex-coffee-deep)" : "transparent",
              color: view === "map" ? "white" : "inherit",
            }}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>
      </div>

      {/* Body: split on desktop, toggle on mobile */}
      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[1fr_1.1fr]">
        {/* List */}
        <div
          className={`overflow-y-auto rounded-2xl ${view === "map" ? "hidden md:block" : "block"}`}
        >
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/60" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="grid h-full place-items-center rounded-2xl bg-white p-10 text-center text-sm text-muted-foreground">
              No cafés match these filters yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((s) => (
                <CoffeeShopCard key={s.id} shop={s} onHover={setHovered} active={hovered === s.id} />
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className={`overflow-hidden rounded-2xl ${view === "list" ? "hidden md:block" : "block"}`}>
          <Suspense fallback={<div className="h-full w-full animate-pulse rounded-2xl bg-white/60" />}>
            {mapShops.length > 0 && (
              <CoffeeMap shops={mapShops} center={center} activeId={hovered} />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
