import { useMemo } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import { MapCore } from "@/components/app/map/MapCore";
import { trailMapCenter } from "@/lib/trails";

export interface TrailMapStop {
  order: number;
  shop_name: string;
  latitude: number | null;
  longitude: number | null;
  done?: boolean;
}

interface TrailMapProps {
  stops: TrailMapStop[];
  mapThemeId?: string | null;
  className?: string;
}

function stopIcon(order: number, done: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:9999px;display:grid;place-items:center;
      font-size:12px;font-weight:800;color:#fff;
      background:${done ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6f4e37,#3d2314)"};
      border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);
    ">${order}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function TrailMap({ stops, mapThemeId, className = "h-56 w-full rounded-2xl overflow-hidden" }: TrailMapProps) {
  const positioned = useMemo(
    () =>
      stops.filter(
        (s): s is TrailMapStop & { latitude: number; longitude: number } =>
          s.latitude != null && s.longitude != null,
      ),
    [stops],
  );

  const center = useMemo(() => trailMapCenter(stops), [stops]);
  const line = useMemo(
    () => positioned.map((s) => [s.latitude, s.longitude] as [number, number]),
    [positioned],
  );

  return (
    <div className={className}>
      <MapCore center={center} zoom={13} mapThemeId={mapThemeId} layoutKey={`trail-${stops.length}`}>
        {line.length > 1 && (
          <Polyline
            positions={line}
            pathOptions={{ color: "#0ea5e9", weight: 4, opacity: 0.85, dashArray: "8 10" }}
          />
        )}
        {positioned.map((s) => (
          <Marker
            key={`${s.order}-${s.shop_name}`}
            position={[s.latitude, s.longitude]}
            icon={stopIcon(s.order, !!s.done)}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              {s.order}. {s.shop_name}
            </Tooltip>
          </Marker>
        ))}
      </MapCore>
    </div>
  );
}
