import L from "leaflet";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";
import { REWARD_ICON_META } from "@/lib/reward-icons";
import { rewardMarkerIconHtml } from "@/lib/map/reward-marker-icon";

export interface CampaignMarkerVisual {
  color: string;
  ring: string;
}

export const REWARD_MARKER_STYLES: Record<CampaignRewardType, CampaignMarkerVisual> = Object.fromEntries(
  Object.entries(REWARD_ICON_META).map(([type, meta]) => [type, { color: meta.color, ring: meta.ring }]),
) as Record<CampaignRewardType, CampaignMarkerVisual>;

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
          <span class="cofex-campaign-pin__icon">${rewardMarkerIconHtml(state.rewardType)}</span>
        </div>
        ${check}
      </div>`,
    iconSize: [48, 56],
    iconAnchor: [24, 52],
  });
}
