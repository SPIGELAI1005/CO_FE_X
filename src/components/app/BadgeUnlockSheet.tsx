import { Link } from "@tanstack/react-router";
import { Award, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfettiBurst } from "@/components/app/CofexDecor";
import { badgeIconMeta, BADGE_RARITY_STYLES, normalizeBadgeRarity } from "@/lib/badges";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

interface UnlockedBadge {
  slug: string;
  name: string;
  rarity?: string;
}

interface BadgeUnlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badges: UnlockedBadge[];
  onContinue?: () => void;
}

export function BadgeUnlockSheet({ open, onOpenChange, badges, onContinue }: BadgeUnlockSheetProps) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="relative z-[1300] max-h-[85dvh] overflow-y-auto rounded-t-3xl border-[color:var(--border)] bg-gradient-to-b from-[color:var(--cofex-cream-warm)] to-white px-5 pb-8 pt-2"
      >
        <ConfettiBurst active={open} />
        <SheetHeader className="text-left">
          <div
            className="cofex-badge-unlock-icon relative mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Award className="h-9 w-9 text-white drop-shadow" />
          </div>
          <SheetTitle className="text-center text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {badges.length === 1 ? t("badges.unlockTitleOne") : t("badges.unlockTitleMany", { count: badges.length })}
          </SheetTitle>
          <SheetDescription className="text-center text-[color:var(--cofex-black)]/65">
            {t("badges.unlockSubtitle")}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {badges.map((b, i) => {
            const meta = badgeIconMeta(b.slug);
            const Icon = meta.Icon;
            const rarity = normalizeBadgeRarity(b.rarity);
            const style = BADGE_RARITY_STYLES[rarity];
            return (
              <div
                key={b.slug}
                className={`cofex-badge-unlock-item cofex-badge-card cofex-badge-card--earned cofex-app-card flex items-center gap-3 p-4 ring-2 ${style.ring}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.from} ${meta.to}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[color:var(--cofex-coffee-deep)]">{b.name}</div>
                  <div className="text-xs text-[color:var(--cofex-black)]/55">{t(style.labelKey)}</div>
                </div>
                <Sparkles className="h-5 w-5 shrink-0 text-[color:var(--cofex-accent-gold)]" />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            to="/passport"
            className="cofex-onboarding-cta w-full rounded-full py-3 text-center text-sm font-semibold text-white shadow-md"
            onClick={() => {
              trackExplorerEvent("badge_unlocked", { source: "check_in", count: badges.length });
              onOpenChange(false);
            }}
          >
            {t("badges.viewInPassport")}
          </Link>
          <button
            type="button"
            className="w-full rounded-full border border-[color:var(--border)] py-3 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]"
            onClick={() => {
              onOpenChange(false);
              onContinue?.();
            }}
          >
            {t("badges.continue")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
