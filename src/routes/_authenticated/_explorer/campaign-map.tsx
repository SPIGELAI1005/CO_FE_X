import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Locate, Loader2, Map as MapIcon } from "lucide-react";
import { AppPage } from "@/components/app/AppPageShell";
import { useUser } from "@/hooks/use-user";
import { useProfile } from "@/lib/queries/profile";
import {
  DEFAULT_CAMPAIGN_MAP_FILTERS,
  filterCampaignPins,
  useCampaignMapPins,
  type CampaignMapFilters,
  type MapCampaignPin,
} from "@/lib/queries/campaign-map";

const CampaignDiscoveryMap = lazy(() =>
  import("@/components/app/map/CampaignDiscoveryMap").then((m) => ({
    default: m.CampaignDiscoveryMap,
  })),
);
const MapCampaignSheet = lazy(() =>
  import("@/components/app/map/MapCampaignSheet").then((m) => ({
    default: m.MapCampaignSheet,
  })),
);
const CampaignMapFiltersBar = lazy(() =>
  import("@/components/app/map/CampaignMapFilters").then((m) => ({
    default: m.CampaignMapFiltersBar,
  })),
);

const DEFAULT_CENTER: [number, number] = [38.7139, -9.1394];

export const Route = createFileRoute("/_authenticated/_explorer/campaign-map")({
  head: () => ({ meta: [{ title: "Campaign Map · CO:FE(X)" }] }),
  component: CampaignMapPage,
});

function CampaignMapPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [filters, setFilters] = useState<CampaignMapFilters>(DEFAULT_CAMPAIGN_MAP_FILTERS);
  const [activePin, setActivePin] = useState<MapCampaignPin | null>(null);

  const pinsQuery = useCampaignMapPins(user?.id, center);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }, []);

  const filteredPins = useMemo(() => {
    const all = pinsQuery.data ?? [];
    return filterCampaignPins(all, filters);
  }, [pinsQuery.data, filters]);

  const activeId = activePin?.campaignId ?? null;

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCenter([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 6000 },
    );
  }

  function handleMarkerClick(campaignId: string) {
    const pin = filteredPins.find((p) => p.campaignId === campaignId) ?? null;
    setActivePin(pin);
  }

  return (
    <AppPage fullHeight className="relative flex min-h-0 flex-1 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1100] flex flex-col gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <Link
            to="/campaigns"
            className="cofex-cafe-hero-badge inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("campaignMap.back")}
          </Link>
          <div className="cofex-cafe-hero-badge rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-[color:var(--cofex-coffee-deep)]">
            <MapIcon className="mr-1 inline h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
            {t("campaignMap.title")}
          </div>
        </div>
        <div className="pointer-events-auto cofex-app-card rounded-2xl bg-white/95 p-3 backdrop-blur-sm">
          <Suspense fallback={null}>
            <CampaignMapFiltersBar
              filters={filters}
              resultCount={filteredPins.length}
              onChange={setFilters}
              onClear={() => setFilters(DEFAULT_CAMPAIGN_MAP_FILTERS)}
            />
          </Suspense>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {pinsQuery.isLoading ? (
          <div className="flex h-full items-center justify-center bg-[color:var(--cofex-cream)]">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--cofex-cyan)]" />
          </div>
        ) : filteredPins.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[color:var(--cofex-cream)] px-6 text-center">
            <div className="cofex-empty-state-icon">
              <MapIcon className="h-8 w-8 text-[color:var(--cofex-cyan)]" aria-hidden />
            </div>
            <p className="text-lg font-bold text-[color:var(--cofex-coffee-deep)]">
              {t("campaignMap.emptyTitle")}
            </p>
            <p className="max-w-sm text-sm text-[color:var(--cofex-black)]/65">
              {t("campaignMap.emptyDescription")}
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_CAMPAIGN_MAP_FILTERS)}
              className="cofex-onboarding-cta rounded-full px-4 py-2 text-sm font-semibold text-white"
            >
              {t("campaignMap.clearFilters")}
            </button>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center bg-[color:var(--cofex-cream)]">
                <Loader2 className="h-8 w-8 animate-spin text-[color:var(--cofex-cyan)]" />
              </div>
            }
          >
            <CampaignDiscoveryMap
              pins={filteredPins}
              center={center}
              activeCampaignId={activeId}
              onMarkerClick={handleMarkerClick}
              mapThemeId={profile?.map_theme}
              layoutKey={`campaign-map-${filteredPins.length}`}
            />
          </Suspense>
        )}

        <button
          type="button"
          onClick={locate}
          className="absolute bottom-24 right-4 z-[1050] flex h-12 w-12 items-center justify-center rounded-full bg-white text-[color:var(--cofex-coffee-deep)] shadow-lg ring-1 ring-[color:var(--border)] transition hover:scale-105 sm:bottom-8"
          aria-label={t("explore.useMyLocation")}
        >
          <Locate className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
        </button>
      </div>

      <Suspense fallback={null}>
        <MapCampaignSheet pin={activePin} onClose={() => setActivePin(null)} />
      </Suspense>
    </AppPage>
  );
}
