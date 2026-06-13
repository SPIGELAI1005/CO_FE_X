import type { LucideIcon } from "lucide-react";
import {
  Coffee,
  CupSoda,
  Leaf,
  Sparkles,
  Croissant,
  GraduationCap,
  Dog,
  Laptop,
  Gift,
  Megaphone,
  Star,
} from "lucide-react";

export interface ExploreFilterOption {
  id: string;
  label: string;
  Icon: LucideIcon;
  description?: string;
}

export const EXPLORE_REWARD_FILTERS: ExploreFilterOption[] = [
  {
    id: "free",
    label: "Free coffee today",
    Icon: Gift,
    description: "Cafés with an active free-coffee offer",
  },
  {
    id: "campaigns",
    label: "Active campaigns",
    Icon: Megaphone,
    description: "Spots running EEFFOC campaigns right now",
  },
];

export const EXPLORE_TAG_FILTERS: ExploreFilterOption[] = [
  { id: "Espresso", label: "Espresso", Icon: Coffee },
  { id: "Cappuccino", label: "Cappuccino", Icon: CupSoda },
  { id: "Matcha", label: "Matcha", Icon: Leaf },
  { id: "Specialty Coffee", label: "Specialty coffee", Icon: Sparkles },
  { id: "Bakery", label: "Bakery", Icon: Croissant },
];

export const EXPLORE_AMENITY_FILTERS: ExploreFilterOption[] = [
  {
    id: "Student Friendly",
    label: "Student friendly",
    Icon: GraduationCap,
    description: "Study-friendly hours & pricing",
  },
  {
    id: "Pet Friendly",
    label: "Pet friendly",
    Icon: Dog,
    description: "Dogs welcome inside or on the terrace",
  },
  {
    id: "Remote Work Friendly",
    label: "Remote work friendly",
    Icon: Laptop,
    description: "Wi‑Fi, outlets & laptop-friendly seating",
  },
];

export const EXPLORE_RATING_FILTERS = [
  { value: 0, label: "Any rating", Icon: Star },
  { value: 3.5, label: "3.5+ stars", Icon: Star },
  { value: 4, label: "4+ stars", Icon: Star },
  { value: 4.5, label: "4.5+ stars", Icon: Star },
] as const;

export function exploreFilterIcon(id: string): LucideIcon {
  const all = [...EXPLORE_REWARD_FILTERS, ...EXPLORE_TAG_FILTERS, ...EXPLORE_AMENITY_FILTERS];
  return all.find((f) => f.id === id)?.Icon ?? Sparkles;
}
