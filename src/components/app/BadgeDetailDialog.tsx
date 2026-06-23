import { useTranslation } from "react-i18next";
import { Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  badgeIconMeta,
  badgeProgress,
  BADGE_RARITY_STYLES,
  normalizeBadgeRarity,
  type BadgeCriteria,
  type ExplorerBadgeStats,
} from "@/lib/badges";

export interface BadgeDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  rarity: string;
  criteria: BadgeCriteria | null;
  earnedAt?: string | null;
  isEarned: boolean;
}

interface BadgeDetailDialogProps {
  badge: BadgeDetail | null;
  stats: ExplorerBadgeStats;
  onClose: () => void;
}

export function BadgeDetailDialog({ badge, stats, onClose }: BadgeDetailDialogProps) {
  const { t, i18n } = useTranslation();
  if (!badge) return null;

  const rarity = normalizeBadgeRarity(badge.rarity);
  const style = BADGE_RARITY_STYLES[rarity];
  const meta = badgeIconMeta(badge.slug);
  const Icon = meta.Icon;
  const progress = badgeProgress(badge.criteria, stats);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-[color:var(--border)] p-0">
        <div className={`bg-gradient-to-br ${style.glow} px-6 pb-8 pt-6 text-white`}>
          <DialogHeader className="text-left">
            <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${style.chip}`}>
              {t(style.labelKey)}
            </span>
            <DialogTitle className="mt-3 text-2xl font-extrabold text-white">{badge.name}</DialogTitle>
            <DialogDescription className="text-white/80">{badge.description}</DialogDescription>
          </DialogHeader>

          <div className="relative mx-auto mt-6 grid h-24 w-24 place-items-center rounded-3xl bg-white/20 shadow-xl ring-4 ring-white/30 backdrop-blur">
            <Icon className="h-12 w-12 text-white drop-shadow" />
            {!badge.isEarned && (
              <div className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-[color:var(--cofex-coffee-deep)] text-white shadow">
                <Lock className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 p-6">
          {badge.isEarned ? (
            <div className="flex items-center gap-2 rounded-2xl bg-[color:var(--cofex-cream)] px-4 py-3 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
              <Sparkles className="h-4 w-4 text-[color:var(--cofex-accent-gold)]" />
              {badge.earnedAt
                ? t("badges.unlockedOn", {
                    date: new Date(badge.earnedAt).toLocaleDateString(i18n.language, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    }),
                  })
                : t("badges.unlocked")}
            </div>
          ) : (
            <p className="text-sm text-[color:var(--cofex-black)]/60">{t("badges.lockedHint")}</p>
          )}

          <div>
            <div className="mb-2 flex justify-between text-xs font-semibold text-[color:var(--cofex-black)]/60">
              <span>{t("badges.progress")}</span>
              <span>
                {progress.current} / {progress.threshold}
              </span>
            </div>
            <Progress value={progress.pct} className="h-2.5" />
            <p className="mt-2 text-xs text-[color:var(--cofex-black)]/50">
              {t("badges.progressPct", { pct: progress.pct })}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
