export function formatTrailDistance(meters: number, locale = "en"): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return locale.startsWith("de")
      ? `${km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`
      : `${km.toLocaleString(locale, { maximumFractionDigits: 1 })} km`;
  }
  return locale.startsWith("de") ? `${meters} m` : `${meters} m`;
}

export function formatTrailDuration(minutes: number, locale = "en"): string {
  if (minutes < 60) {
    return locale.startsWith("de") ? `${minutes} Min.` : `${minutes} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return locale.startsWith("de") ? `${h} Std. ${m} Min.` : `${h}h ${m}m`;
}

export function trailThemeLabelKey(theme: string | null | undefined): string {
  if (!theme) return "trails.themes.explore";
  return `trails.themes.${theme}` as const;
}

export function trailProgressPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

export function trailMapCenter(
  stops: { latitude: number | null; longitude: number | null }[],
  fallback: [number, number] = [48.1351, 11.582],
): [number, number] {
  const valid = stops.filter((s) => s.latitude != null && s.longitude != null) as {
    latitude: number;
    longitude: number;
  }[];
  if (!valid.length) return fallback;
  const lat = valid.reduce((a, s) => a + s.latitude, 0) / valid.length;
  const lng = valid.reduce((a, s) => a + s.longitude, 0) / valid.length;
  return [lat, lng];
}
