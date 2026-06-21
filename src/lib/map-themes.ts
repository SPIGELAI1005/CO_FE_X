export type MapThemeId = "default" | "sunrise" | "neon" | "luxury" | "spring";

export interface MapTheme {
  id: MapThemeId;
  labelKey: string;
  tileUrl: string;
  filter?: string;
}

export const MAP_THEMES: MapTheme[] = [
  {
    id: "default",
    labelKey: "mapTheme.default",
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  {
    id: "sunrise",
    labelKey: "mapTheme.sunrise",
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    filter: "sepia(0.25) saturate(1.2) hue-rotate(-10deg)",
  },
  {
    id: "neon",
    labelKey: "mapTheme.neon",
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    filter: "saturate(1.3) contrast(1.05)",
  },
  {
    id: "luxury",
    labelKey: "mapTheme.luxury",
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    filter: "sepia(0.35) brightness(0.95)",
  },
  {
    id: "spring",
    labelKey: "mapTheme.spring",
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    filter: "hue-rotate(320deg) saturate(1.15)",
  },
];

export function getMapTheme(id: string | null | undefined): MapTheme {
  return MAP_THEMES.find((t) => t.id === id) ?? MAP_THEMES[0];
}

export function themeForTimeOfDay(): MapThemeId {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return "sunrise";
  if (h >= 20 || h < 5) return "neon";
  return "default";
}
