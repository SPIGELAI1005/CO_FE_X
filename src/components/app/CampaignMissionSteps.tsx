import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Check,
  Circle,
  Compass,
  Gift,
  MapPin,
  QrCode,
  Share2,
  Sparkles,
  Store,
  Trophy,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  missionProgressPercent,
  type MissionStepId,
  type MissionStepState,
} from "@/lib/campaign-mission";

const STEP_ICONS: Record<MissionStepId, LucideIcon> = {
  discover: Compass,
  visit: MapPin,
  check_in: QrCode,
  social_post: Share2,
  submit_proof: Upload,
  cafe_confirms: Store,
  reward_unlocked: Gift,
  badge_xp: Trophy,
};

interface CampaignMissionStepsProps {
  steps: MissionStepState[];
  microcopyKey?: string;
}

export function CampaignMissionSteps({ steps, microcopyKey }: CampaignMissionStepsProps) {
  const { t } = useTranslation();
  const required = steps.filter((s) => s.required);
  const progress = missionProgressPercent(steps);

  return (
    <div className="cofex-app-card overflow-hidden p-0">
      <div className="border-b border-[color:var(--border)] bg-gradient-to-r from-[color:var(--cofex-pastel-blue)]/40 to-[color:var(--cofex-cream)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--cofex-cyan)]">
              {t("campaignMission.missionPath")}
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
              {t("campaignMission.yourProgress")}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold tabular-nums text-[color:var(--cofex-coffee-deep)]">
              {progress}%
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
              {t("campaignMission.complete")}
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--cofex-cyan)] to-[color:var(--cofex-accent-gold)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {microcopyKey && (
          <p className="mt-3 text-sm leading-relaxed text-[color:var(--cofex-coffee-deep)]/80">
            {t(microcopyKey)}
          </p>
        )}
      </div>

      <ol className="divide-y divide-[color:var(--border)]">
        {required.map((step, index) => (
          <MissionStepRow key={step.id} step={step} index={index + 1} isLast={index === required.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function MissionStepRow({
  step,
  index,
  isLast,
}: {
  step: MissionStepState;
  index: number;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const Icon = STEP_ICONS[step.id];

  return (
    <li
      className={`relative flex gap-4 px-5 py-4 transition-colors ${
        step.status === "current" ? "bg-[color:var(--cofex-pastel-blue)]/25" : ""
      }`}
    >
      {!isLast && (
        <span
          className={`absolute bottom-0 left-[2.125rem] top-12 w-0.5 -translate-x-1/2 ${
            step.status === "complete" ? "bg-[color:var(--cofex-cyan)]" : "bg-[color:var(--border)]"
          }`}
          aria-hidden
        />
      )}

      <div className="relative z-[1] shrink-0">
        <StepIndicator status={step.status} index={index} Icon={Icon} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={`text-sm font-bold ${
            step.status === "upcoming"
              ? "text-[color:var(--cofex-black)]/40"
              : "text-[color:var(--cofex-coffee-deep)]"
          }`}
        >
          {t(`campaignMission.steps.${step.id}.title`)}
        </p>
        <p
          className={`mt-0.5 text-xs leading-relaxed ${
            step.status === "current"
              ? "text-[color:var(--cofex-coffee-deep)]/75"
              : "text-[color:var(--cofex-black)]/50"
          }`}
        >
          {t(`campaignMission.steps.${step.id}.${step.status === "current" ? "current" : "hint"}`)}
        </p>
        {step.status === "current" && step.id === "reward_unlocked" && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
            <Sparkles className="h-3 w-3" /> {t("campaignMission.almostThere")}
          </p>
        )}
        {step.status === "complete" && step.id === "badge_xp" && (
          <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> {t("campaignMission.xpEarned")}
          </p>
        )}
      </div>
    </li>
  );
}

function StepIndicator({
  status,
  index,
  Icon,
}: {
  status: MissionStepState["status"];
  index: number;
  Icon: LucideIcon;
}) {
  if (status === "complete") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--cofex-cyan)] text-white shadow-sm">
        <Check className="h-4 w-4" strokeWidth={3} />
      </div>
    );
  }

  if (status === "current") {
    return (
      <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--cofex-coffee-deep)] text-white shadow-md ring-4 ring-[color:var(--cofex-cyan)]/25">
        <Icon className="h-4 w-4" />
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--cofex-accent-gold)] text-[9px] font-bold text-white">
          {index}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[color:var(--border)] bg-white text-[color:var(--cofex-black)]/30">
      <Circle className="h-3 w-3" />
    </div>
  );
}

export function getCampaignMissionMicrocopy(phase: string, joined: boolean): string {
  if (!joined) return "campaignMission.microcopy.discover";
  if (phase === "check_in") return "campaignMission.microcopy.checkIn";
  if (phase === "social_post") return "campaignMission.microcopy.social";
  if (phase === "pending_review") return "campaignMission.microcopy.review";
  if (phase === "reward") return "campaignMission.microcopy.reward";
  return "campaignMission.microcopy.default";
}
