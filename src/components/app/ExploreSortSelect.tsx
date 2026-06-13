import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Gift, MapPin, Star, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const EXPLORE_SORT_OPTIONS = [
  {
    value: "distance",
    label: "Distance",
    description: "Closest cafés first",
    Icon: MapPin,
  },
  {
    value: "rating",
    label: "Rating",
    description: "Highest rated spots",
    Icon: Star,
  },
  {
    value: "popularity",
    label: "Popularity",
    description: "Most visited by explorers",
    Icon: TrendingUp,
  },
  {
    value: "free",
    label: "Free coffee first",
    description: "Offers with free coffee on top",
    Icon: Gift,
  },
] as const;

export type ExploreSortValue = (typeof EXPLORE_SORT_OPTIONS)[number]["value"];

interface ExploreSortSelectProps {
  value: ExploreSortValue;
  onChange: (value: ExploreSortValue) => void;
}

function SortOption({
  label,
  description,
  Icon,
  active,
  onClick,
}: {
  label: string;
  description: string;
  Icon: LucideIcon;
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
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--cofex-pastel-blue)]/50">
        <Icon
          className={`h-4 w-4 ${
            active ? "text-[color:var(--cofex-coffee-deep)]" : "text-[color:var(--cofex-cyan)]"
          }`}
        />
      </span>
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
  const [open, setOpen] = useState(false);
  const current = EXPLORE_SORT_OPTIONS.find((o) => o.value === value) ?? EXPLORE_SORT_OPTIONS[0];
  const CurrentIcon = current.Icon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="cofex-app-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
        >
          <CurrentIcon className="h-3.5 w-3.5 text-[color:var(--cofex-cyan)]" />
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
              Sort by
            </p>
            <p className="mt-1 text-sm font-extrabold text-[color:var(--cofex-coffee-deep)]">
              Order your café list
            </p>
          </div>
          <div className="cofex-filters-panel-body space-y-2 px-3 py-3">
            {EXPLORE_SORT_OPTIONS.map((option) => (
              <SortOption
                key={option.value}
                label={option.label}
                description={option.description}
                Icon={option.Icon}
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
