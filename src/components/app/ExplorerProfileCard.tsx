import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Award, Coffee, Sparkles, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { levelFor, levelDisplayName } from "@/lib/explorer-levels";
import { xpEventLabelKey, formatXpDelta } from "@/lib/xp-system";
import type { Profile } from "@/lib/queries/profile";
import type { XpEventRow } from "@/lib/queries/xp-events";
import { BEVERAGE_TAGS } from "@/lib/beverage-tags";

interface ExplorerProfileCardProps {
  profile: Profile | null | undefined;
  email?: string | null;
  uniqueCafes: number;
  badgeCount: number;
  recentXp: XpEventRow[];
  onAvatarClick?: () => void;
  avatarUploading?: boolean;
  initials: string;
}

export function ExplorerProfileCard({
  profile,
  email,
  uniqueCafes,
  badgeCount,
  recentXp,
  onAvatarClick,
  avatarUploading,
  initials,
}: ExplorerProfileCardProps) {
  const { t, i18n } = useTranslation();
  const points = profile?.total_points ?? 0;
  const { level, next, progress, levelNum, pointsToNext } = levelFor(points);
  const LevelIcon = level.Icon;

  const drinkId =
    profile?.preferred_drink_categories?.[0] ??
    profile?.preferences?.coffee_tags?.[0] ??
    "coffee";
  const drinkTag = BEVERAGE_TAGS.find((b) => b.id === drinkId) ?? BEVERAGE_TAGS[0];

  return (
    <div className="cofex-app-card overflow-hidden">
      <div className="relative bg-gradient-to-br from-[color:var(--cofex-coffee-deep)] via-[#3d2314] to-[color:var(--cofex-black)] p-6 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-[color:var(--cofex-cyan)]/15 blur-2xl" />

        <div className="relative flex gap-4">
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={!onAvatarClick || avatarUploading}
            className="group relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 rounded-full"
            aria-label={t("explorerCard.changeAvatar")}
          >
            <Avatar className="h-20 w-20 border-[3px] border-amber-200/50 shadow-lg">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="bg-amber-100 text-xl font-bold text-amber-900">{initials}</AvatarFallback>
            </Avatar>
            {onAvatarClick && (
              <span className="absolute inset-0 rounded-full bg-black/30 opacity-0 transition group-hover:opacity-100" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/70">
              {t("explorerCard.eyebrow")}
            </p>
            <h2 className="mt-1 truncate text-xl font-extrabold">
              {profile?.display_name ?? t("pages.profile.titleFallback")}
            </h2>
            {email && <p className="truncate text-xs text-white/55">{email}</p>}

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${level.gradient} text-white shadow`}
              >
                <LevelIcon className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                  {t("levels.levelN", { n: levelNum, name: levelDisplayName(level, t) })}
                </div>
                <div className="text-xs font-semibold text-white/90">
                  {points.toLocaleString(i18n.language)} XP
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-5">
          <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">
            <span>{t("explorerCard.levelProgress")}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2.5 bg-white/15 [&>div]:bg-gradient-to-r [&>div]:from-amber-300 [&>div]:to-orange-400" />
          {next && (
            <p className="mt-2 text-xs text-amber-100/75">
              {t("levels.pointsToNext", {
                points: pointsToNext.toLocaleString(i18n.language),
                name: levelDisplayName(next, t),
              })}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[color:var(--border)] border-b border-[color:var(--border)] bg-[color:var(--cofex-cream)]/40">
        <StatCell
          icon={<Coffee className="h-4 w-4 text-[color:var(--cofex-coffee-deep)]" />}
          label={t("explorerCard.cafesVisited")}
          value={uniqueCafes}
        />
        <StatCell
          icon={<Award className="h-4 w-4 text-[color:var(--cofex-accent-gold)]" />}
          label={t("explorerCard.badges")}
          value={badgeCount}
        />
        <StatCell
          icon={<span className="text-base leading-none">{drinkTag.emoji}</span>}
          label={t("explorerCard.favoriteDrink")}
          value={t(drinkTag.labelKey)}
          compact
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[color:var(--cofex-coffee-deep)]">
            <Sparkles className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
            {t("explorerCard.recentAchievements")}
          </div>
          <Link to="/wallet" className="inline-flex items-center text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline">
            {t("explorerCard.viewAll")}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentXp.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--cofex-black)]/55">{t("explorerCard.noXpYet")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentXp.map((ev) => (
              <li
                key={ev.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-[color:var(--border)]/60"
              >
                <span className="truncate text-[color:var(--cofex-black)]/75">
                  {t(xpEventLabelKey(ev.action_type))}
                </span>
                <span className="shrink-0 font-bold text-[color:var(--cofex-coffee-deep)]">
                  {formatXpDelta(ev.xp_value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-2 py-3 text-center">
      {icon}
      <div className={`mt-1 font-extrabold text-[color:var(--cofex-coffee-deep)] ${compact ? "text-xs leading-tight" : "text-lg"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
        {label}
      </div>
    </div>
  );
}
