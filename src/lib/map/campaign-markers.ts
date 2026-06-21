import L from "leaflet";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

export interface CampaignMarkerVisual {
  emoji: string;
  color: string;
  ring: string;
}

export const REWARD_MARKER_STYLES: Record<CampaignRewardType, CampaignMarkerVisual> = {
  coffee: { emoji: "☕", color: "#3d2417", ring: "#c8a063" },
  espresso: { emoji: "☕", color: "#2c1810", ring: "#e8b86d" },
  cappuccino: { emoji: "🥛", color: "#5c4033", ring: "#f5deb3" },
  matcha: { emoji: "🍵", color: "#2d5016", ring: "#7cb342" },
  ice_cream: { emoji: "🍦", color: "#c2185b", ring: "#f8bbd0" },
  juice: { emoji: "🧃", color: "#f57c00", ring: "#ffe082" },
  cola: { emoji: "🥤", color: "#b71c1c", ring: "#ef9a9a" },
  other: { emoji: "🎁", color: "#455a64", ring: "#80cbc4" },
};

export function inferRewardType(
  rewardType: string | null | undefined,
  rewardDescription: string | null | undefined,
): CampaignRewardType {
  const t = rewardType?.toLowerCase();
  if (t && t in REWARD_MARKER_STYLES) return t as CampaignRewardType;
  const d = (rewardDescription ?? "").toLowerCase();
  if (d.includes("matcha")) return "matcha";
  if (d.includes("espresso")) return "espresso";
  if (d.includes("cappuccino")) return "cappuccino";
  if (d.includes("ice cream") || d.includes("gelato")) return "ice_cream";
  if (d.includes("juice")) return "juice";
  if (d.includes("cola") || d.includes("soda")) return "cola";
  if (d.includes("coffee")) return "coffee";
  return "other";
}

export interface CampaignMarkerState {
  rewardType: CampaignRewardType;
  active?: boolean;
  limited?: boolean;
  expiringSoon?: boolean;
  collected?: boolean;
  selected?: boolean;
}

export function createCampaignMarkerIcon(state: CampaignMarkerState): L.DivIcon {
  const style = REWARD_MARKER_STYLES[state.rewardType];
  const classes = [
    "cofex-campaign-pin",
    state.active !== false ? "cofex-campaign-pin--pulse" : "",
    state.limited ? "cofex-campaign-pin--limited" : "",
    state.expiringSoon ? "cofex-campaign-pin--urgent" : "",
    state.collected ? "cofex-campaign-pin--collected" : "",
    state.selected ? "cofex-campaign-pin--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const check = state.collected
    ? `<span class="cofex-campaign-pin__check">✓</span>`
    : state.limited
      ? `<span class="cofex-campaign-pin__badge">!</span>`
      : state.expiringSoon
        ? `<span class="cofex-campaign-pin__badge cofex-campaign-pin__badge--urgent">⏱</span>`
        : "";

  return L.divIcon({
    className: "cofex-pin",
    html: `
      <div class="${classes}" style="--pin-color:${style.color};--pin-ring:${style.ring}">
        <div class="cofex-campaign-pin__glow"></div>
        <div class="cofex-campaign-pin__body">
          <span class="cofex-campaign-pin__emoji">${style.emoji}</span>
        </div>
        ${check}
      </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 52],
  });
}
