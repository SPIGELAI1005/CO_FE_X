import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getMapTheme } from "@/lib/map-themes";

export function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.6 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

export function MapInvalidateSize({ layoutKey }: { layoutKey: string }) {
  const map = useMap();
  useEffect(() => {
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 320);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [layoutKey, map]);
  return null;
}

interface MapCoreProps {
  center: [number, number];
  zoom?: number;
  mapThemeId?: string | null;
  layoutKey?: string;
  children: React.ReactNode;
  className?: string;
}

export function MapCore({
  center,
  zoom = 14,
  mapThemeId,
  layoutKey = "default",
  children,
  className = "cofex-explore-map-host",
}: MapCoreProps) {
  const ref = useRef<L.Map | null>(null);
  const theme = getMapTheme(mapThemeId);

  return (
    <div className={`${className} h-full min-h-0 w-full`}>
      <MapContainer
        ref={ref as React.Ref<L.Map>}
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", filter: theme.filter }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={theme.tileUrl}
        />
        {children}
        <MapInvalidateSize layoutKey={layoutKey} />
      </MapContainer>
    </div>
  );
}
