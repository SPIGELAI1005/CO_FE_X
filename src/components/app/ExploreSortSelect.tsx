import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useExploreSortLabels } from "@/lib/i18n/use-filter-labels";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { EXPLORE_SORT_ICON_META } from "@/lib/explorer-section-icons";

export const EXPLORE_SORT_OPTIONS = [
  { value: "distance" },
  { value: "rating" },
  { value: "popularity" },
  { value: "free" },
] as const;

export type ExploreSortValue = (typeof EXPLORE_SORT_OPTIONS)[number]["value"];

interface ExploreSortSelectProps {
  value: ExploreSortValue;
  onChange: (value: ExploreSortValue) => void;
}

function SortOption({
  label,
  description,
  sortValue,
  active,
  onClick,
}: {
  label: string;
  description: string;
  sortValue: ExploreSortValue;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cofex-filters-option flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left"
      style={{
        borderColor: active ? "var(--cofex-coffee-deep)" : "var(--border)",
        background: active ? "var(--cofex-pastel-blue)" : "white",
        fontWeight: active ? 600 : 400,
      }}
    >
      <CofexIconTile meta={EXPLORE_SORT_ICON_META[sortValue]} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{label}</span>
        <span className="block text-[11px] text-[color:var(--cofex-black)]/55">{description}</span>
      </span>
      {active && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--cofex-coffee-deep)]">
          <Check className="h-3.5 w-3.5 text-white" />
        </span>
      )}
    </button>
  );
}

export function ExploreSortSelect({ value, onChange }: ExploreSortSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const options = useExploreSortLabels();
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cofex-app-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          <CofexIconTile meta={EXPLORE_SORT_ICON_META[value]} size="xs" />
          {current.label}
          <ChevronDown className="h-3.5 w-3.5 text-[color:var(--cofex-coffee-deep)]/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="cofex-popover-panel-host z-50 w-[min(calc(100vw-2rem),18rem)]"
      >
        <div className="cofex-filters-panel overflow-hidden rounded-3xl">
          <div className="cofex-filters-panel-header px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[color:var(--cofex-cyan)]">
              {t("sort.title")}
            </p>
            <p className="mt-1 text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("sort.subtitle")}</p>
          </div>
          <div className="cofex-filters-panel-body space-y-2 px-3 py-3">
            {options.map((option) => (
              <SortOption
                key={option.value}
                label={option.label}
                description={option.description}
                sortValue={option.value}
                active={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
