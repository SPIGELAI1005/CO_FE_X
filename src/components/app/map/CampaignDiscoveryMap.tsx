import { useMemo } from "react";
import { Marker } from "react-leaflet";
import { MapCore, FlyTo } from "@/components/app/map/MapCore";
import { createCampaignMarkerIcon } from "@/lib/map/campaign-markers";
import type { MapCampaignPin } from "@/lib/queries/campaign-map";

interface CampaignDiscoveryMapProps {
  pins: MapCampaignPin[];
  center: [number, number];
  activeCampaignId?: string | null;
  onMarkerClick?: (campaignId: string) => void;
  layoutKey?: string;
  mapThemeId?: string | null;
}

export function CampaignDiscoveryMap({
  pins,
  center,
  activeCampaignId,
  onMarkerClick,
  layoutKey = "campaign-map",
  mapThemeId,
}: CampaignDiscoveryMapProps) {
  const activePin = useMemo(
    () => pins.find((p) => p.campaignId === activeCampaignId),
    [pins, activeCampaignId],
  );
  const focus: [number, number] = activePin
    ? [activePin.latitude, activePin.longitude]
    : center;

  return (
    <MapCore center={center} zoom={14} mapThemeId={mapThemeId} layoutKey={layoutKey}>
      {pins.map((p) => (
        <Marker
          key={p.campaignId}
          position={[p.latitude, p.longitude]}
          icon={createCampaignMarkerIcon({
            rewardType: p.rewardType,
            active: true,
            limited: p.isLimited,
            expiringSoon: p.isExpiringSoon,
            collected: p.visited,
            selected: p.campaignId === activeCampaignId,
          })}
          eventHandlers={{ click: () => onMarkerClick?.(p.campaignId) }}
        />
      ))}
      {activePin && <FlyTo center={focus} zoom={16} />}
    </MapCore>
  );
}
