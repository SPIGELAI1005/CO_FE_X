import type { OpeningHours } from "@/lib/domain/campaign-reward-model";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function parseHm(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

export function isOpenNow(openingHours: OpeningHours | null | undefined, at = new Date()): boolean | null {
  if (!openingHours || Object.keys(openingHours).length === 0) return null;
  const key = DAY_KEYS[at.getDay()];
  const day = openingHours[key];
  if (!day || day.closed) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  return now >= parseHm(day.open) && now < parseHm(day.close);
}

export function openingStatusLabel(open: boolean | null): "open" | "closed" | "unknown" {
  if (open === null) return "unknown";
  return open ? "open" : "closed";
}
