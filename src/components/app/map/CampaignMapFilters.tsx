import { useTranslation } from "react-i18next";
import { SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REWARD_MARKER_STYLES } from "@/lib/map/campaign-markers";
import { REWARD_TYPES } from "@/lib/domain/campaign-reward-model";
import type { CampaignMapFilters } from "@/lib/queries/campaign-map";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

interface CampaignMapFiltersBarProps {
  filters: CampaignMapFilters;
  resultCount: number;
  onChange: (next: CampaignMapFilters) => void;
  onClear: () => void;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
        active ? "cofex-app-chip-active" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function CampaignMapFiltersBar({
  filters,
  resultCount,
  onChange,
  onClear,
}: CampaignMapFiltersBarProps) {
  const { t } = useTranslation();

  const activeCount =
    (filters.drinkTypes.length ? 1 : 0) +
    (filters.maxDistanceKm < 10 ? 1 : 0) +
    (filters.availableNow ? 1 : 0) +
    (filters.newOnly ? 1 : 0) +
    (filters.expiringSoon ? 1 : 0) +
    (filters.notCollected ? 1 : 0) +
    (filters.badgeCampaigns ? 1 : 0);

  function toggleDrink(type: CampaignRewardType) {
    const next = filters.drinkTypes.includes(type)
      ? filters.drinkTypes.filter((d) => d !== type)
      : [...filters.drinkTypes, type];
    onChange({ ...filters, drinkTypes: next });
  }

  function toggleBool(key: keyof Pick<
    CampaignMapFilters,
    "availableNow" | "newOnly" | "expiringSoon" | "notCollected" | "badgeCampaigns"
  >) {
    onChange({ ...filters, [key]: !filters[key] });
  }

  return (
    <div className="pointer-events-auto space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">
          {t("campaignMap.results", { count: resultCount })}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-cyan)]"
          >
            <X className="h-3 w-3" /> {t("campaignMap.clearFilters")}
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                filters.drinkTypes.length ? "cofex-app-chip-active" : ""
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
              {t("campaignMap.filters.drinkType")}
              {filters.drinkTypes.length > 0 && (
                <span className="rounded-full bg-[color:var(--cofex-coffee-deep)] px-1.5 text-[9px] text-white">
                  {filters.drinkTypes.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
              {t("campaignMap.filters.drinkType")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REWARD_TYPES.map((type) => (
                <FilterChip
                  key={type}
                  active={filters.drinkTypes.includes(type)}
                  onClick={() => toggleDrink(type)}
                >
                  {REWARD_MARKER_STYLES[type].emoji}{" "}
                  {t(`campaignMap.rewardTypes.${type}`)}
                </FilterChip>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                filters.maxDistanceKm < 10 ? "cofex-app-chip-active" : ""
              }`}
            >
              {t("campaignMap.filters.distance")} · {filters.maxDistanceKm} km
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-black)]/50">
              {t("campaignMap.filters.maxDistance", { km: filters.maxDistanceKm })}
            </label>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={filters.maxDistanceKm}
              onChange={(e) =>
                onChange({ ...filters, maxDistanceKm: Number(e.target.value) })
              }
              className="mt-3 w-full accent-[color:var(--cofex-cyan)]"
            />
          </PopoverContent>
        </Popover>

        <FilterChip active={filters.availableNow} onClick={() => toggleBool("availableNow")}>
          {t("campaignMap.filters.availableNow")}
        </FilterChip>
        <FilterChip active={filters.newOnly} onClick={() => toggleBool("newOnly")}>
          {t("campaignMap.filters.newCampaigns")}
        </FilterChip>
        <FilterChip active={filters.expiringSoon} onClick={() => toggleBool("expiringSoon")}>
          {t("campaignMap.filters.expiringSoon")}
        </FilterChip>
        <FilterChip active={filters.notCollected} onClick={() => toggleBool("notCollected")}>
          {t("campaignMap.filters.notCollected")}
        </FilterChip>
        <FilterChip active={filters.badgeCampaigns} onClick={() => toggleBool("badgeCampaigns")}>
          {t("campaignMap.filters.badgeCampaigns")}
        </FilterChip>
      </div>
    </div>
  );
}
