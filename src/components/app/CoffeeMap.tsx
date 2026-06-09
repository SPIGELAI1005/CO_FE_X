import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center[0], center[1], zoom]);
  return null;
}

export function CoffeeMap({
  shops,
  center,
  activeId,
  onMarkerClick,
}: {
  shops: MapShop[];
  center: [number, number];
  activeId?: string | null;
  onMarkerClick?: (id: string) => void;
}) {
  const ref = useRef<L.Map | null>(null);
  const activeShop = useMemo(() => shops.find((s) => s.id === activeId), [shops, activeId]);
  const focus: [number, number] = activeShop
    ? [activeShop.latitude, activeShop.longitude]
    : center;

  return (
    <MapContainer
      ref={ref as any}
      center={center}
      zoom={14}
      scrollWheelZoom
      style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shops.map((s) => (
        <Marker
          key={s.id}
          position={[s.latitude, s.longitude]}
          icon={coffeePin(s.free_coffee_available)}
          eventHandlers={{ click: () => onMarkerClick?.(s.id) }}
        />
      ))}
      {activeShop && <FlyTo center={focus} zoom={16} />}
    </MapContainer>
  );
}
