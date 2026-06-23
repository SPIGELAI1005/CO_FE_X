import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DRINK_CATEGORY_META,
  drinkCategoryMeta,
  energyVibeLabelKey,
} from "@/lib/drink-categories";
import { useDrinkTracker, useSetDailyDrinkLimit } from "@/lib/queries/drink-tracker";

export function DrinkTrackerCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useDrinkTracker();
  const setLimit = useSetDailyDrinkLimit();
  const [limitInput, setLimitInput] = useState("");
  const [showLimitEditor, setShowLimitEditor] = useState(false);

  const todayCount = data?.today_count ?? 0;
  const weekCount = data?.week_count ?? 0;
  const energyPct = data?.energy_pct ?? 0;
  const dailyLimit = data?.daily_limit ?? null;
  const vibeKey = energyVibeLabelKey(data?.energy_vibe);
  const favorite = drinkCategoryMeta(data?.favorite_category);
  const topWeek = drinkCategoryMeta(data?.top_category_week);
  const todayDrinks = data?.today_drinks ?? [];

  async function saveLimit() {
    const parsed = limitInput.trim() === "" ? null : Number(limitInput);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 1 || parsed > 20)) {
      toast.error(t("drinkTracker.limitInvalid"));
      return;
    }
    try {
      await setLimit.mutateAsync(parsed);
      toast.success(parsed ? t("drinkTracker.limitSaved") : t("drinkTracker.limitCleared"));
      setShowLimitEditor(false);
      setLimitInput("");
    } catch {
      toast.error(t("drinkTracker.limitFailed"));
    }
  }

  return (
    <div className="cofex-app-card overflow-hidden">
      <div className="bg-gradient-to-br from-amber-50 via-[color:var(--cofex-cream)] to-[color:var(--cofex-pastel-blue)]/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--cofex-coffee-deep)]/60">
              {t("drinkTracker.eyebrow")}
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
              {t("drinkTracker.title")}
            </h3>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-amber-500" />
        </div>

        <div className="mt-5 flex items-center gap-5">
          <div className="relative shrink-0">
            <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
              <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(61,35,20,0.08)" strokeWidth="8" />
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="url(#drinkEnergyGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${energyPct * 2.51} 251`}
                transform="rotate(-90 48 48)"
                className="transition-all duration-700"
              />
              <defs>
                <linearGradient id="drinkEnergyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--cofex-cyan)" />
                  <stop offset="100%" stopColor="var(--cofex-coffee-deep)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">{todayCount}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--cofex-black)]/45">
                {t("drinkTracker.todayShort")}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">{t(vibeKey)}</p>
            <p className="text-xs text-[color:var(--cofex-black)]/55">{t("drinkTracker.energyHint")}</p>
            {dailyLimit ? (
              <p className="text-xs font-semibold text-[color:var(--cofex-cyan)]">
                {t("drinkTracker.softGoal", { count: dailyLimit, current: todayCount })}
              </p>
            ) : (
              <p className="text-xs text-[color:var(--cofex-black)]/45">{t("drinkTracker.noLimitSet")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t("drinkTracker.today")} value={isLoading ? "…" : String(todayCount)} />
          <StatTile label={t("drinkTracker.thisWeek")} value={isLoading ? "…" : String(weekCount)} />
          <StatTile
            label={t("drinkTracker.favorite")}
            value={data?.favorite_category ? `${favorite.emoji} ${t(favorite.labelKey)}` : "—"}
            sub={data?.favorite_count ? t("drinkTracker.times", { count: data.favorite_count }) : undefined}
          />
          <StatTile
            label={t("drinkTracker.mostVisited")}
            value={data?.top_category_week ? `${topWeek.emoji} ${t(topWeek.labelKey)}` : "—"}
            sub={
              data?.top_category_week_count
                ? t("drinkTracker.thisWeekCount", { count: data.top_category_week_count })
                : undefined
            }
          />
        </div>

        {todayDrinks.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-coffee-deep)]/70">
              {t("drinkTracker.collectedToday")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {todayDrinks.map((d) => {
                const meta = drinkCategoryMeta(d.drink_category);
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-xl bg-[color:var(--cofex-cream)]/60 px-3 py-2 text-sm"
                  >
                    <span>
                      {meta.emoji} {t(meta.labelKey)}
                      {d.shop_name ? (
                        <span className="text-[color:var(--cofex-black)]/45"> · {d.shop_name}</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <CategoryChips counts={data?.week_by_category ?? {}} />

        <div className="rounded-xl border border-dashed border-[color:var(--cofex-coffee-deep)]/15 bg-[color:var(--cofex-cream)]/40 p-3">
          <p className="text-[11px] leading-relaxed text-[color:var(--cofex-black)]/55">{t("drinkTracker.disclaimer")}</p>
        </div>

        {!showLimitEditor ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full rounded-full"
            onClick={() => {
              setLimitInput(dailyLimit ? String(dailyLimit) : "");
              setShowLimitEditor(true);
            }}
          >
            {dailyLimit ? t("drinkTracker.editLimit") : t("drinkTracker.setLimit")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={20}
              placeholder={t("drinkTracker.limitPlaceholder")}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="h-9 flex-1 rounded-full border px-3 text-sm"
            />
            <Button type="button" size="sm" className="rounded-full" disabled={setLimit.isPending} onClick={saveLimit}>
              {t("drinkTracker.saveLimit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setShowLimitEditor(false)}
            >
              {t("drinkTracker.cancel")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--cofex-cream)]/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/45">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[color:var(--cofex-black)]/45">{sub}</p>}
    </div>
  );
}

function CategoryChips({ counts }: { counts: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = DRINK_CATEGORY_META.filter((c) => (counts[c.id] ?? 0) > 0);

  if (entries.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-coffee-deep)]/70">
        {t("drinkTracker.weekBreakdown")}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entries.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 rounded-full bg-[color:var(--cofex-pastel-blue)]/30 px-2.5 py-1 text-xs font-semibold text-[color:var(--cofex-coffee-deep)]"
          >
            {c.emoji} {t(c.labelKey)} ×{counts[c.id]}
          </span>
        ))}
      </div>
    </div>
  );
}
