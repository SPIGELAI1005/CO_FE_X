import type { CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";
import type { CampaignExplorerPhase } from "@/lib/campaign-fulfillment";

export type MissionStepId =
  | "discover"
  | "visit"
  | "check_in"
  | "social_post"
  | "submit_proof"
  | "cafe_confirms"
  | "reward_unlocked"
  | "badge_xp";

export type MissionStepStatus = "complete" | "current" | "upcoming" | "skipped";

export interface MissionStepDefinition {
  id: MissionStepId;
  required: boolean;
}

export interface MissionStepState extends MissionStepDefinition {
  status: MissionStepStatus;
}

const ALL_STEPS: MissionStepId[] = [
  "discover",
  "visit",
  "check_in",
  "social_post",
  "submit_proof",
  "cafe_confirms",
  "reward_unlocked",
  "badge_xp",
];

export function getMissionStepDefinitions(mode: CampaignFulfillmentMode): MissionStepDefinition[] {
  const required = new Set<MissionStepId>(["discover", "visit", "reward_unlocked", "badge_xp"]);

  if (mode === "check_in" || mode === "hybrid") {
    required.add("check_in");
  }
  if (mode === "social_proof" || mode === "hybrid") {
    required.add("social_post");
    required.add("submit_proof");
    required.add("cafe_confirms");
  }

  return ALL_STEPS.map((id) => ({
    id,
    required: required.has(id),
  }));
}

export interface MissionProgressInput {
  fulfillmentMode: CampaignFulfillmentMode;
  joined: boolean;
  phase: CampaignExplorerPhase;
  myCheckIns: number;
  requiredCheckIns: number;
  hasSocialSubmission: boolean;
  latestSocialStatus: "none" | "pending" | "approved" | "rejected";
  hasRedemption: boolean;
  rewardUsed: boolean;
}

function stepComplete(input: MissionProgressInput, id: MissionStepId): boolean {
  switch (id) {
    case "discover":
      return input.joined;
    case "visit":
      return input.myCheckIns > 0 || input.hasSocialSubmission || input.hasRedemption;
    case "check_in":
      return input.myCheckIns >= input.requiredCheckIns;
    case "social_post":
      return input.hasSocialSubmission || input.latestSocialStatus !== "none";
    case "submit_proof":
      return input.hasSocialSubmission;
    case "cafe_confirms":
      return input.latestSocialStatus === "approved" || input.hasRedemption;
    case "reward_unlocked":
      return input.hasRedemption;
    case "badge_xp":
      return input.hasRedemption;
    default:
      return false;
  }
}

export function resolveMissionSteps(input: MissionProgressInput): MissionStepState[] {
  const definitions = getMissionStepDefinitions(input.fulfillmentMode);

  const completion = new Map<MissionStepId, boolean>();
  for (const def of definitions) {
    completion.set(def.id, def.required ? stepComplete(input, def.id) : false);
  }

  let currentAssigned = false;
  return definitions.map((def) => {
    if (!def.required) {
      return { ...def, status: "skipped" as const };
    }

    const isComplete = completion.get(def.id) ?? false;
    if (isComplete) {
      return { ...def, status: "complete" as const };
    }

    if (!currentAssigned && input.phase !== "ended" && input.phase !== "full") {
      currentAssigned = true;
      return { ...def, status: "current" as const };
    }

    return { ...def, status: "upcoming" as const };
  });
}

export function missionProgressPercent(steps: MissionStepState[]): number {
  const required = steps.filter((s) => s.required);
  if (!required.length) return 0;
  const complete = required.filter((s) => s.status === "complete").length;
  const current = required.some((s) => s.status === "current") ? 0.5 : 0;
  return Math.min(100, Math.round(((complete + current) / required.length) * 100));
}

export function formatExpiryCountdown(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  if (end <= now) return null;
  const diff = end - now;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days >= 2) return `${days} days left`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left`;
  const mins = Math.max(1, Math.floor(diff / (60 * 1000)));
  return `${mins}m left`;
}
