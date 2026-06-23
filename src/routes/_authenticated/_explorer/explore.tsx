import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Map as MapIcon, List as ListIcon, Search, Locate, Columns2, Maximize2 } from "lucide-react";
import { CoffeeShopCard, type ShopCardData } from "@/components/app/CoffeeShopCard";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { EXPLORE_PANEL_ICONS } from "@/lib/explorer-section-icons";
import type { MapShop } from "@/components/app/CoffeeMap";
import { ExploreFilters } from "@/components/app/ExploreFilters";
import { ExploreSortSelect } from "@/components/app/ExploreSortSelect";
import { MoodFilterChips } from "@/components/app/MoodFilterChips";
import { AppPage } from "@/components/app/AppPageShell";
import { haversineMetres } from "@/lib/geo";
import { moodScore, type MoodId } from "@/lib/mood-discovery";
import { useCoffeeShops, useCoffeeShopCampaignCounts } from "@/lib/queries/coffee-shops";
import { useProfile } from "@/lib/queries/profile";
import { useUser } from "@/hooks/use-user";

const CoffeeMap = lazy(() =>
  import("@/components/app/CoffeeMap").then((m) => ({ default: m.CoffeeMap })),
);
const MapShopSheet = lazy(() =>
  import("@/components/app/MapShopSheet").then((m) => ({ default: m.MapShopSheet })),
);

const SORTS = ["distance", "rating", "popularity", "free"] as const;
const VIEWS = ["split", "list", "map"] as const;
type ViewMode = (typeof VIEWS)[number];
type PanelFocus = "balanced" | "list" | "map";
type PanelSize = "expanded" | "balanced" | "peek";

const DEFAULT_CENTER: [number, number] = [38.7139, -9.1394]; // Lisbon

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tags: fallback(z.array(z.string()), []).default([]),
  amenities: fallback(z.array(z.string()), []).default([]),
  free: fallback(z.boolean(), false).default(false),
  campaignsOnly: fallback(z.boolean(), false).default(false),
  minRating: fallback(z.number().min(0).max(5), 0).default(0),
  sort: fallback(z.enum(SORTS), "distance").default("distance"),
  view: fallback(z.enum(VIEWS), "list").default("list"),
  radius: fallback(z.number().min(0.5).max(50), 5).default(5),
  mood: fallback(z.enum(["cozy", "productive", "date", "hangover"]).nullable(), null).default(null),
});

function haversineKm(a: [number, number], b: [number, number]) {
  return haversineMetres(a[0], a[1], b[0], b[1]) / 1000;
}

export const Route = createFileRoute("/_authenticated/_explorer/explore")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Explore · CO:FE(X)" }] }),
  component: ExplorePage,
});

function getPanelSizes(view: ViewMode, focus: PanelFocus): { list: PanelSize; map: PanelSize } {
  if (view === "list") return { list: "expanded", map: "peek" };
  if (view === "map") return { list: "peek", map: "expanded" };
  if (focus === "list") return { list: "expanded", map: "peek" };
  if (focus === "map") return { list: "peek", map: "expanded" };
  return { list: "balanced", map: "balanced" };
}

function panelSizeClass(size: PanelSize) {
  if (size === "peek") return "cofex-explore-panel-peek";
  if (size === "expanded") return "cofex-explore-panel-expanded";
  return "cofex-explore-panel-balanced";
}

function PanelPeek({
  side,
  label,
  panelKey,
  badge,
  onClick,
  showLabel = true,
}: {
  side: "left" | "right";
  label: string;
  panelKey: "list" | "map";
  badge?: string | number;
  onClick: () => void;
  showLabel?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cofex-explore-peek ${side === "left" ? "rounded-r-3xl rounded-l-xl" : "rounded-l-3xl rounded-r-xl"}`}
      aria-label={t("explore.showPanel", { label })}
    >
      <CofexIconTile meta={EXPLORE_PANEL_ICONS[panelKey]} size="sm" />
      {showLabel && <span className="cofex-explore-peek-label">{label}</span>}
      {badge != null && (
        <span className="rounded-full bg-[color:var(--cofex-coffee-deep)] px-1.5 py-0.5 text-[9px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function PanelHeader({
  title,
  expanded,
  showSplitControl,
  onExpand,
  onRestoreSplit,
}: {
  title: string;
  expanded: boolean;
  showSplitControl: boolean;
  onExpand: () => void;
  onRestoreSplit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="cofex-explore-panel-header shrink-0">
      <button
        type="button"
        onClick={onExpand}
        className="min-w-0 text-left text-[10px] font-extrabold uppercase tracking-[0.15em] text-[color:var(--cofex-coffee-deep)] sm:text-[11px] sm:tracking-[0.2em]"
      >
        {title}
      </button>
      {showSplitControl && (
        <button
          type="button"
          onClick={expanded ? onRestoreSplit : onExpand}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[color:var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[color:var(--cofex-coffee-deep)] transition hover:border-[color:var(--cofex-cyan)] hover:bg-[color:var(--cofex-pastel-blue)]"
          aria-label={expanded ? t("explore.restoreSplit") : t("explore.expandPanel")}
        >
          {expanded ? (
            <>
              <Columns2 className="h-3 w-3" />
              <span className="hidden sm:inline">{t("explore.split")}</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3 w-3" />
              <span className="hidden sm:inline">{t("explore.expandPanelShort")}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ExplorePage() {
  const { t } = useTranslation();
  const { q, tags, amenities, free, campaignsOnly, minRating, sort, view, radius, mood } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  type S = z.infer<typeof searchSchema>;
  const update = (patch: Partial<S>) =>
    navigate({
      to: "/explore",
      search: (prev: S) => ({ ...prev, ...patch }),
      replace: true,
    });

  const { data: rows = [], isLoading: loading } = useCoffeeShops();
  const shopIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: counts = {} } = useCoffeeShopCampaignCounts(shopIds);
  const [hovered, setHovered] = useState<string | null>(null);
  const [mapSelectedShop, setMapSelectedShop] = useState<MapShop | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [panelFocus, setPanelFocus] = useState<PanelFocus>("balanced");

  const setView = (next: ViewMode) => {
    setPanelFocus("balanced");
    update({ view: next });
  };

  const panelSizes = getPanelSizes(view, panelFocus);
  const layoutKey = `${view}-${panelFocus}`;

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

  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches && view === "split") {
      update({ view: "list" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coerce split away on phone once
  }, [view]);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const cards: ShopCardData[] = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const list = rows
      .filter((r) => (free ? r.free_coffee_available : true))
      .filter((r) => !campaignsOnly || (counts[r.id]?.campaigns ?? 0) > 0)
      .filter((r) => !minRating || Number(r.rating) >= minRating)
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
    const moodRank = (id: string) => {
      if (!mood) return 0;
      const row = rows.find((r) => r.id === id);
      return row ? moodScore(mood as MoodId, row) : 0;
    };
    return list.sort((a, b) => {
      if (mood) {
        const md = moodRank(b.id) - moodRank(a.id);
        if (md !== 0) return md;
      }
      return sorters[sort](a, b);
    });
  }, [rows, counts, tags, amenities, free, campaignsOnly, minRating, q, sort, center, radius, mood]);

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

  const filterCount =
    tags.length +
    amenities.length +
    (free ? 1 : 0) +
    (campaignsOnly ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  return (
    <AppPage fullHeight className="min-h-0 flex-1">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col gap-2 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
        {/* Search panel */}
        <div className="cofex-app-card shrink-0 space-y-3 p-3 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--cofex-cyan)]" />
              <input
                type="search"
                placeholder={t("explore.searchPlaceholder")}
                value={q}
                onChange={(e) => update({ q: e.target.value })}
                className="w-full rounded-full border border-[color:var(--border)] bg-[color:var(--cofex-cream)]/40 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[color:var(--cofex-cyan)] focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={locate}
              className="cofex-app-chip inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold"
              title={t("explore.useMyLocation")}
            >
              <Locate className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" /> {t("explore.nearMe")}
            </button>
            <label className="flex w-full items-center gap-2 text-xs text-[color:var(--cofex-black)]/60 sm:min-w-[210px] sm:w-auto">
              <span className="whitespace-nowrap font-semibold text-[color:var(--cofex-coffee-deep)]">{t("explore.radius")}</span>
              <input
                type="range"
                min={0.5}
                max={20}
                step={0.5}
                value={radius}
                onChange={(e) => update({ radius: Number(e.target.value) })}
                className="flex-1 accent-[color:var(--cofex-coffee-deep)]"
              />
              <span className="w-12 text-right font-bold tabular-nums text-[color:var(--cofex-coffee-deep)]">
                {radius} km
              </span>
            </label>
          </div>

          <ExploreFilters
            filters={{ free, campaignsOnly, tags, amenities, minRating }}
            filterCount={filterCount}
            resultCount={cards.length}
            onToggleFree={() => update({ free: !free })}
            onToggleCampaigns={() => update({ campaignsOnly: !campaignsOnly })}
            onToggleTag={(tag) => update({ tags: toggle(tags, tag) })}
            onToggleAmenity={(amenity) => update({ amenities: toggle(amenities, amenity) })}
            onSetMinRating={(rating) => update({ minRating: rating })}
            onClear={() =>
              update({ tags: [], amenities: [], free: false, campaignsOnly: false, minRating: 0, mood: null })
            }
          />
          <div>
            <p className="mb-1.5 px-0.5 text-[10px] font-extrabold uppercase tracking-[0.25em] text-[color:var(--cofex-cyan)]">
              {t("mood.label")}
            </p>
            <MoodFilterChips value={mood as MoodId | null} onChange={(m) => update({ mood: m })} />
          </div>
        </div>

        {/* Sort + view */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[color:var(--cofex-coffee-deep)]">{t("explore.cafesCount", { count: cards.length })}</span>
            <span className="text-[color:var(--cofex-black)]/30">·</span>
            <span className="text-[color:var(--cofex-black)]/55">{t("explore.sort")}</span>
            <ExploreSortSelect value={sort} onChange={(next) => update({ sort: next })} />
          </div>
          <div className="inline-flex shrink-0 rounded-full border border-[color:var(--border)] bg-white p-0.5 shadow-sm sm:p-1">
            {(["list", "split", "map"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:text-xs ${
                  v === "split" ? "hidden sm:inline-flex" : "inline-flex"
                } ${
                  view === v
                    ? "text-white"
                    : "text-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-pastel-blue)]/50"
                }`}
                style={view === v ? { background: "var(--gradient-coffee)" } : undefined}
              >
                {v === "map" ? <MapIcon className="h-3.5 w-3.5" /> : v === "list" ? <ListIcon className="h-3.5 w-3.5" /> : v === "split" ? <Columns2 className="h-3.5 w-3.5" /> : null}
                <span className={v === "split" ? "inline" : "hidden min-[380px]:inline"}>{t(`explore.${v}`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results, collapsible list + map */}
        <div className="cofex-explore-panels min-h-0 flex-1">
          {/* List panel */}
          <div className={`cofex-explore-panel ${panelSizeClass(panelSizes.list)}`}>
            {panelSizes.list === "peek" ? (
              <PanelPeek
                side="left"
                label={t("explore.list")}
                showLabel={false}
                panelKey="list"
                badge={cards.length}
                onClick={() => {
                  if (view === "map") setView("list");
                  else setPanelFocus("list");
                }}
              />
            ) : (
              <div className="cofex-app-card flex min-h-0 w-full flex-1 flex-col">
                <PanelHeader
                  title={t("explore.cafesCount", { count: cards.length })}
                  expanded={panelSizes.list === "expanded" && view === "split"}
                  showSplitControl={view === "split"}
                  onExpand={() => setPanelFocus("list")}
                  onRestoreSplit={() => setPanelFocus("balanced")}
                />
                <div className="cofex-app-card-inner min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
                  {loading ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-64 animate-pulse rounded-2xl bg-[color:var(--cofex-cream)]/60" />
                      ))}
                    </div>
                  ) : cards.length === 0 ? (
                    <div className="grid h-full min-h-[240px] place-items-center p-10 text-center">
                      <div>
                        <p className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("explore.noShops")}</p>
                        <p className="mt-2 text-sm text-[color:var(--cofex-black)]/60">{t("explore.noShopsHint")}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-3 ${
                        panelSizes.list === "expanded" && view === "list"
                          ? "sm:grid-cols-2 lg:grid-cols-3"
                          : "sm:grid-cols-2"
                      }`}
                    >
                      {cards.map((s) => (
                        <CoffeeShopCard key={s.id} shop={s} onHover={setHovered} active={hovered === s.id} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Map panel */}
          <div className={`cofex-explore-panel ${panelSizeClass(panelSizes.map)}`}>
            {panelSizes.map === "peek" ? (
              <PanelPeek
                side="right"
                label={t("explore.map")}
                panelKey="map"
                onClick={() => {
                  if (view === "list") setView("map");
                  else setPanelFocus("map");
                }}
              />
            ) : (
              <div className="cofex-app-card flex min-h-0 w-full flex-1 flex-col">
                <PanelHeader
                  title={t("explore.map")}
                  expanded={panelSizes.map === "expanded" && view === "split"}
                  showSplitControl={view === "split"}
                  onExpand={() => setPanelFocus("map")}
                  onRestoreSplit={() => setPanelFocus("balanced")}
                />
                <div className="cofex-explore-map-host cofex-app-card-inner min-h-0 flex-1">
                  <Suspense fallback={<div className="h-full min-h-[16rem] w-full animate-pulse bg-[color:var(--cofex-cream)]/60" />}>
                    <CoffeeMap
                      shops={mapShops}
                      center={center}
                      activeId={hovered}
                      layoutKey={layoutKey}
                      mapThemeId={profile?.map_theme}
                      onMarkerClick={(id) => {
                        const shop = mapShops.find((s) => s.id === id) ?? null;
                        setMapSelectedShop(shop);
                        setHovered(id);
                      }}
                    />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Suspense fallback={null}>
        <MapShopSheet shop={mapSelectedShop} onClose={() => setMapSelectedShop(null)} />
      </Suspense>
    </AppPage>
  );
}
