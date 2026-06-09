import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Map as MapIcon, List as ListIcon, SlidersHorizontal, X, Search, Locate } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoffeeShopCard, type ShopCardData } from "@/components/app/CoffeeShopCard";

const CoffeeMap = lazy(() =>
  import("@/components/app/CoffeeMap").then((m) => ({ default: m.CoffeeMap })),
);

const TAGS = ["Espresso", "Cappuccino", "Matcha", "Specialty Coffee", "Bakery"] as const;
const AMENITIES = ["Student Friendly", "Pet Friendly", "Remote Work Friendly"] as const;
const SORTS = ["distance", "rating", "popularity", "free"] as const;
const VIEWS = ["split", "list", "map"] as const;

const DEFAULT_CENTER: [number, number] = [38.7139, -9.1394]; // Lisbon

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tags: fallback(z.array(z.string()), []).default([]),
  amenities: fallback(z.array(z.string()), []).default([]),
  free: fallback(z.boolean(), false).default(false),
  sort: fallback(z.enum(SORTS), "distance").default("distance"),
  view: fallback(z.enum(VIEWS), "split").default("split"),
  radius: fallback(z.number().min(0.5).max(50), 5).default(5),
});

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
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Explore — CO:FE(X)" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q, tags, amenities, free, sort, view, radius } = Route.useSearch();
  const navigate = useNavigate({ from: "/_authenticated/_explorer/explore" });
  type S = z.infer<typeof searchSchema>;
  const update = (patch: Partial<S>) =>
    navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, { campaigns: number; popularity: number }>>({});
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("coffee_shops")
        .select(
          "id, slug, name, city, latitude, longitude, cover_image_url, rating, rating_count, tags, amenities, free_coffee_available",
        )
        .eq("status", "approved");
      if (!mounted) return;
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = list.map((r) => r.id);
      if (ids.length) {
        const [{ data: camps }, { data: checks }] = await Promise.all([
          supabase.from("campaigns").select("coffee_shop_id").in("coffee_shop_id", ids).eq("status", "active"),
          supabase.from("check_ins").select("coffee_shop_id, user_id").in("coffee_shop_id", ids),
        ]);
        const tally: Record<string, { campaigns: number; popularity: number }> = {};
        ids.forEach((id) => (tally[id] = { campaigns: 0, popularity: 0 }));
        (camps ?? []).forEach((c: any) => tally[c.coffee_shop_id] && (tally[c.coffee_shop_id].campaigns += 1));
        const seen: Record<string, Set<string>> = {};
        (checks ?? []).forEach((c: any) => (seen[c.coffee_shop_id] ||= new Set()).add(c.user_id));
        Object.entries(seen).forEach(([id, s]) => tally[id] && (tally[id].popularity = s.size));
        if (mounted) setCounts(tally);
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };
  useEffect(() => {
    locate();
  }, []);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const cards: ShopCardData[] = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = rows
      .filter((r) => (free ? r.free_coffee_available : true))
      .filter((r) => (tags.length ? tags.every((t: string) => r.tags.includes(t)) : true))
      .filter((r) => (amenities.length ? amenities.every((a: string) => r.amenities.includes(a)) : true))
      .filter((r) =>
        ql
          ? r.name.toLowerCase().includes(ql) ||
            (r.city ?? "").toLowerCase().includes(ql) ||
            r.tags.some((t) => t.toLowerCase().includes(ql))
          : true,
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
      .filter((c) => c.distance_km <= radius);

    const sorters: Record<typeof sort, (a: ShopCardData, b: ShopCardData) => number> = {
      distance: (a, b) => a.distance_km - b.distance_km,
      rating: (a, b) => b.rating - a.rating || b.rating_count - a.rating_count,
      popularity: (a, b) => b.popularity - a.popularity,
      free: (a, b) =>
        Number(b.free_coffee_available) - Number(a.free_coffee_available) ||
        a.distance_km - b.distance_km,
    };
    return list.sort(sorters[sort]);
  }, [rows, counts, tags, amenities, free, q, sort, center, radius]);

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

  const filterCount = tags.length + amenities.length + (free ? 1 : 0);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col" style={{ background: "var(--cofex-cream, #f5efe6)" }}>
      {/* Search + radius bar */}
      <div className="border-b bg-white px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search cafés, neighbourhoods, vibes…"
              value={q}
              onChange={(e) => update({ q: e.target.value })}
              className="w-full rounded-full border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
              style={{ borderColor: "var(--border)" }}
            />
          </div>
          <button
            onClick={locate}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)" }}
            title="Use my location"
          >
            <Locate className="h-3.5 w-3.5" /> Near me
          </button>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground sm:min-w-[200px]">
            <span className="whitespace-nowrap">Radius</span>
            <input
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={radius}
              onChange={(e) => update({ radius: Number(e.target.value) })}
              className="flex-1 accent-foreground"
            />
            <span className="w-12 text-right font-semibold tabular-nums text-foreground">{radius} km</span>
          </label>
        </div>

        {/* Filters & sort */}
        <div className="mx-auto mt-3 flex max-w-6xl items-center gap-2 overflow-x-auto">
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal className="h-3 w-3" /> Filters{filterCount > 0 && ` · ${filterCount}`}
          </span>
          <button
            onClick={() => update({ free: !free })}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              background: free ? "var(--cofex-coffee-deep, #3d2417)" : "transparent",
              color: free ? "white" : "var(--cofex-coffee-deep)",
              border: "1px solid var(--border)",
            }}
          >
            🎁 Free coffee
          </button>
          {[...TAGS, ...AMENITIES].map((t) => {
            const isTag = (TAGS as readonly string[]).includes(t);
            const active = isTag ? tags.includes(t) : amenities.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  isTag
                    ? update({ tags: toggle(tags, t) })
                    : update({ amenities: toggle(amenities, t) })
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
          {(filterCount > 0 || q) && (
            <button
              onClick={() => update({ tags: [], amenities: [], free: false, q: "" })}
              className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Sort + view toggle */}
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">{cards.length} cafés</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Sort</span>
          <select
            value={sort}
            onChange={(e) => update({ sort: e.target.value as typeof sort })}
            className="rounded-full border bg-white px-2 py-1 text-xs font-medium outline-none"
            style={{ borderColor: "var(--border)" }}
          >
            <option value="distance">Distance</option>
            <option value="rating">Rating</option>
            <option value="popularity">Popularity</option>
            <option value="free">Free coffee first</option>
          </select>
        </div>
        <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: "var(--border)" }}>
          {(["list", "split", "map"] as const).map((v) => (
            <button
              key={v}
              onClick={() => update({ view: v })}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs capitalize"
              style={{
                background: view === v ? "var(--cofex-coffee-deep)" : "transparent",
                color: view === v ? "white" : "inherit",
              }}
            >
              {v === "map" ? <MapIcon className="h-3.5 w-3.5" /> : v === "list" ? <ListIcon className="h-3.5 w-3.5" /> : null}
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div
        className={`grid flex-1 gap-3 overflow-hidden p-3 ${
          view === "split" ? "md:grid-cols-[1fr_1.1fr]" : "grid-cols-1"
        }`}
      >
        <div className={`overflow-y-auto rounded-2xl ${view === "map" ? "hidden" : "block"}`}>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/60" />
              ))}
            </div>
          ) : cards.length === 0 ? (
            <div className="grid h-full place-items-center rounded-2xl bg-white p-10 text-center text-sm text-muted-foreground">
              No cafés match these filters within {radius} km.
            </div>
          ) : (
            <div className={`grid gap-3 ${view === "list" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
              {cards.map((s) => (
                <CoffeeShopCard key={s.id} shop={s} onHover={setHovered} active={hovered === s.id} />
              ))}
            </div>
          )}
        </div>

        <div className={`overflow-hidden rounded-2xl ${view === "list" ? "hidden" : "block"}`}>
          <Suspense fallback={<div className="h-full w-full animate-pulse rounded-2xl bg-white/60" />}>
            <CoffeeMap shops={mapShops} center={center} activeId={hovered} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
