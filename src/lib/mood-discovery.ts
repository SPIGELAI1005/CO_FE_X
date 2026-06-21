export type MoodId = "cozy" | "productive" | "date" | "hangover";

export interface MoodOption {
  id: MoodId;
  labelKey: string;
  tags: string[];
  amenities: string[];
}

export const MOOD_OPTIONS: MoodOption[] = [
  { id: "cozy", labelKey: "mood.cozy", tags: ["Bakery"], amenities: ["Pet Friendly"] },
  { id: "productive", labelKey: "mood.productive", tags: ["Espresso", "Specialty Coffee"], amenities: ["Remote Work Friendly", "Student Friendly"] },
  { id: "date", labelKey: "mood.date", tags: ["Cappuccino", "Specialty Coffee"], amenities: [] },
  { id: "hangover", labelKey: "mood.hangover", tags: ["Espresso", "Matcha"], amenities: [] },
];

export function moodScore(
  mood: MoodId | null,
  shop: { tags?: string[] | null; amenities?: string[] | null },
): number {
  if (!mood) return 0;
  const m = MOOD_OPTIONS.find((o) => o.id === mood);
  if (!m) return 0;
  const tags = shop.tags ?? [];
  const amenities = shop.amenities ?? [];
  let score = 0;
  for (const t of m.tags) if (tags.includes(t)) score += 2;
  for (const a of m.amenities) if (amenities.includes(a)) score += 1;
  return score;
}
