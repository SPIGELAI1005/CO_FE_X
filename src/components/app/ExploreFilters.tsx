import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Coffee,
  Gift,
  Leaf,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  EXPLORE_AMENITY_FILTERS,
  EXPLORE_RATING_FILTERS,
  EXPLORE_REWARD_FILTERS,
  EXPLORE_TAG_FILTERS,
  type ExploreFilterOption,
} from "@/lib/explore-filters";
import { useExploreFilterLabels } from "@/lib/i18n/use-filter-labels";

export interface ExploreFilterState {
  free: boolean;
  campaignsOnly: boolean;
  tags: string[];
  amenities: string[];
  minRating: number;
}

interface ExploreFiltersProps {
  filters: ExploreFilterState;
  filterCount: number;
  resultCount: number;
  onToggleFree: () => void;
  onToggleCampaigns: () => void;
  onToggleTag: (tag: string) => void;
  onToggleAmenity: (amenity: string) => void;
  onSetMinRating: (rating: number) => void;
  onClear: () => void;
}

function FilterChip({
  active,
  onClick,
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  Icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "cofex-app-chip-active" : ""
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />}
      {children}
    </button>
  );
}

function FilterSection({
  title,
  accent = "var(--cofex-cyan)",
  children,
}: {
  title: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3
        className="text-[10px] font-extrabold uppercase tracking-[0.25em]"
        style={{ color: accent }}
      >
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function RewardOption({
  option,
  active,
  onClick,
  pastelBg,
}: {
  option: ExploreFilterOption;
  active: boolean;
  onClick: () => void;
  pastelBg: string;
}) {
  const Icon = option.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="cofex-filters-option flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left"
      style={{
        borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
        background: active ? "var(--cofex-pastel-blue)" : pastelBg,
        fontWeight: active ? 600 : 400,
      }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm">
        <Icon className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{option.label}</span>
        {option.description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--cofex-black)]/60">
            {option.description}
          </span>
        )}
      </span>
      {active && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--cofex-coffee-deep)]">
          <Check className="h-3.5 w-3.5 text-white" />
        </span>
      )}
    </button>
  );
}

function AmenityOption({
  option,
  active,
  onClick,
}: {
  option: ExploreFilterOption;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = option.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="cofex-filters-option flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left"
      style={{
        borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
        background: active ? "var(--cofex-pastel-lilac)" : "var(--cofex-pastel-gray)",
        fontWeight: active ? 600 : 400,
      }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/85 shadow-sm">
        <Icon className="h-4 w-4 text-[color:var(--cofex-coffee-deep)]" />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{option.label}</span>
        {option.description && (
          <span className="mt-0.5 block text-[11px] leading-snug text-[color:var(--cofex-black)]/60">
            {option.description}
          </span>
        )}
      </span>
      {active && <Check className="mt-1 h-4 w-4 shrink-0 text-[color:var(--cofex-coffee-deep)]" />}
    </button>
  );
}

export function ExploreFilters({
  filters,
  filterCount,
  resultCount,
  onToggleFree,
  onToggleCampaigns,
  onToggleTag,
  onToggleAmenity,
  onSetMinRating,
  onClear,
}: ExploreFiltersProps) {
  const { t } = useTranslation();
  const { rewardFilters, tagFilters, amenityFilters, ratingFilters } = useExploreFilterLabels();
  const extraChips: { key: string; label: string; Icon: LucideIcon; onRemove: () => void }[] = [];

  if (filters.campaignsOnly) {
    extraChips.push({
      key: "campaigns",
      label: t("filters.campaignsChip"),
      Icon: rewardFilters[1].Icon,
      onRemove: onToggleCampaigns,
    });
  }
  if (filters.minRating > 0) {
    extraChips.push({
      key: "rating",
      label: t("filters.starsChip", { rating: filters.minRating }),
      Icon: Star,
      onRemove: () => onSetMinRating(0),
    });
  }
  for (const tag of filters.tags) {
    if (tag === "Espresso" || tag === "Matcha") continue;
    const meta = tagFilters.find((item) => item.id === tag);
    extraChips.push({
      key: `tag-${tag}`,
      label: meta?.label ?? tag,
      Icon: meta?.Icon ?? Sparkles,
      onRemove: () => onToggleTag(tag),
    });
  }
  for (const amenity of filters.amenities) {
    const meta = amenityFilters.find((a) => a.id === amenity);
    extraChips.push({
      key: `amenity-${amenity}`,
      label: meta?.label ?? amenity,
      Icon: meta?.Icon ?? Sparkles,
      onRemove: () => onToggleAmenity(amenity),
    });
  }

  const cafeResultLabel =
    resultCount === 1
      ? t("explore.cafesCountShort", { count: resultCount })
      : t("explore.cafesCountShort_plural", { count: resultCount });

  return (
    <div className="cofex-chip-scroll-row items-center">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              filterCount > 0 ? "cofex-app-chip-active" : ""
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
            {filterCount > 0 ? t("filters.triggerCount", { count: filterCount }) : t("filters.trigger")}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={10}
          className="cofex-popover-panel-host z-50 w-[min(calc(100vw-2rem),24rem)] sm:w-[26rem]"
        >
          <div className="cofex-filters-panel overflow-hidden rounded-3xl">
            <div className="cofex-filters-panel-header px-5 pb-4 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--cofex-cyan)]">
                {t("filters.title")}
              </p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight text-[color:var(--cofex-coffee-deep)]">
                {t("filters.subtitle")}
              </h2>
              <p className="mt-3 text-xs leading-relaxed text-[color:var(--cofex-black)]/65">
                {t("filters.description")}
              </p>
            </div>

            <div className="cofex-filters-panel-body max-h-[min(58vh,26rem)] space-y-5 overflow-y-auto px-5 py-4">
              <FilterSection title={t("filters.rewardsSection")} accent="var(--cofex-coffee-deep)">
                <div className="space-y-2">
                  <RewardOption
                    option={rewardFilters[0]}
                    active={filters.free}
                    onClick={onToggleFree}
                    pastelBg="var(--cofex-pastel-pink)"
                  />
                  <RewardOption
                    option={rewardFilters[1]}
                    active={filters.campaignsOnly}
                    onClick={onToggleCampaigns}
                    pastelBg="var(--cofex-cream-warm)"
                  />
                </div>
              </FilterSection>

              <FilterSection title={t("filters.ratingSection")}>
                <div className="flex flex-wrap gap-2">
                  {ratingFilters.map(({ value, label, Icon }) => {
                    const active = filters.minRating === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => onSetMinRating(value)}
                        className="cofex-filters-tag inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold"
                        style={{
                          borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
                          background: active ? "var(--cofex-pastel-pink)" : "white",
                          color: active ? "var(--cofex-coffee-deep)" : "var(--cofex-black)",
                        }}
                      >
                        {active && <Check className="h-3 w-3" />}
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            value > 0
                              ? "fill-[color:var(--cofex-accent-gold)] text-[color:var(--cofex-accent-gold)]"
                              : "text-[color:var(--cofex-cyan)]"
                          }`}
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={t("filters.tagsSection")} accent="var(--cofex-coffee-deep)">
                <div className="grid grid-cols-2 gap-2">
                  {tagFilters.map((option) => {
                    const active = filters.tags.includes(option.id);
                    const Icon = option.Icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onToggleTag(option.id)}
                        className="cofex-filters-tag flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition"
                        style={{
                          borderColor: active ? "var(--cofex-cyan)" : "var(--border)",
                          background: active ? "var(--cofex-pastel-blue)" : "white",
                          color: active ? "var(--cofex-coffee-deep)" : "inherit",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 text-[color:var(--cofex-cyan)]" />
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </FilterSection>

              <FilterSection title={t("filters.amenitiesSection")} accent="var(--cofex-coffee-deep)">
                <div className="space-y-2">
                  {amenityFilters.map((option) => (
                    <AmenityOption
                      key={option.id}
                      option={option}
                      active={filters.amenities.includes(option.id)}
                      onClick={() => onToggleAmenity(option.id)}
                    />
                  ))}
                </div>
              </FilterSection>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] bg-white px-5 py-4">
              <button
                type="button"
                onClick={onClear}
                disabled={filterCount === 0}
                className="cofex-onboarding-back inline-flex items-center gap-1.5 rounded-full border border-[color:var(--cofex-black)] px-4 py-2 text-xs font-semibold text-[color:var(--cofex-coffee-deep)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("filters.clearAll")}
              </button>
              <span className="cofex-filters-result-pill tabular-nums">{cafeResultLabel}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <FilterChip active={filters.free} onClick={onToggleFree} Icon={Gift}>
        {t("filters.freeCoffeeChip")}
      </FilterChip>
      <FilterChip active={filters.tags.includes("Espresso")} onClick={() => onToggleTag("Espresso")} Icon={Coffee}>
        {t("filters.tags.Espresso")}
      </FilterChip>
      <FilterChip active={filters.tags.includes("Matcha")} onClick={() => onToggleTag("Matcha")} Icon={Leaf}>
        {t("filters.tags.Matcha")}
      </FilterChip>

      {extraChips.map((chip) => (
        <FilterChip key={chip.key} active onClick={chip.onRemove} Icon={chip.Icon}>
          {chip.label}
          <X className="h-3 w-3 opacity-50" />
        </FilterChip>
      ))}
    </div>
  );
}
