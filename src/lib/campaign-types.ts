import type { LucideIcon } from "lucide-react";
import { Camera, Coffee, Croissant, Gift, GraduationCap, Leaf, Sparkles } from "lucide-react";

export const CAMPAIGN_TYPE_META: Record<string, { label: string; Icon: LucideIcon }> = {
  free_espresso_friday: { label: "Free espresso", Icon: Coffee },
  matcha_monday: { label: "Matcha Monday", Icon: Leaf },
  student_week: { label: "Student week", Icon: GraduationCap },
  bogo: { label: "BOGO", Icon: Gift },
  free_with_pastry: { label: "Free with pastry", Icon: Croissant },
  social_story: { label: "Social story", Icon: Camera },
  custom: { label: "Custom", Icon: Sparkles },
};

export function getCampaignTypeMeta(type: string) {
  return CAMPAIGN_TYPE_META[type] ?? CAMPAIGN_TYPE_META.custom;
}
