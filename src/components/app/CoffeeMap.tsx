import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import { MapCore, FlyTo } from "@/components/app/map/MapCore";

export type MapShop = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  free_coffee_available: boolean;
};

const coffeePin = (free: boolean) =>
  L.divIcon({
    className: "cofex-pin",
    html: `
      <div style="position:relative;transform:translate(-50%,-100%);">
        <div style="
          width:40px;height:40px;border-radius:50% 50% 50% 6px;
          transform:rotate(-45deg);
          background:${free ? "var(--cofex-accent-gold, #c8a063)" : "var(--cofex-coffee-deep, #3d2417)"};
          box-shadow:0 6px 16px rgba(0,0,0,.25), 0 0 0 3px white;
          display:grid;place-items:center;
        ">
          <div style="transform:rotate(45deg);color:#fff;font-size:18px;line-height:1;">☕</div>
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

export function CoffeeMap({
  shops,
  center,
  activeId,
  onMarkerClick,
  layoutKey = "default",
  mapThemeId,
}: {
  shops: MapShop[];
  center: [number, number];
  activeId?: string | null;
  onMarkerClick?: (id: string) => void;
  layoutKey?: string;
  mapThemeId?: string | null;
}) {
  const activeShop = useMemo(() => shops.find((s) => s.id === activeId), [shops, activeId]);
  const focus: [number, number] = activeShop
    ? [activeShop.latitude, activeShop.longitude]
    : center;

  return (
    <MapCore
      center={center}
      zoom={14}
      mapThemeId={mapThemeId}
      layoutKey={layoutKey}
      className="cofex-explore-map-host h-full min-h-0 w-full"
    >
      {shops.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={coffeePin(s.free_coffee_available)}
          eventHandlers={{ click: () => onMarkerClick?.(s.id) }}
        />
      ))}
      {activeShop && <FlyTo center={focus} zoom={16} />}
    </MapCore>
  );
}
