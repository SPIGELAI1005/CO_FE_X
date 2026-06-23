import { useTranslation } from "react-i18next";
import { MOMENT_FEED_FILTERS, type MomentFeedFilter } from "@/lib/moments";

interface MomentFeedFiltersProps {
  value: MomentFeedFilter;
  onChange: (filter: MomentFeedFilter) => void;
}

export function MomentFeedFilters({ value, onChange }: MomentFeedFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
      {MOMENT_FEED_FILTERS.map((f) => {
        const active = value === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-[color:var(--cofex-coffee-deep)] bg-[color:var(--cofex-coffee-deep)] text-white"
                : "border-[color:var(--border)] bg-white text-[color:var(--cofex-coffee-deep)] hover:border-[color:var(--cofex-cyan)]"
            }`}
          >
            <span aria-hidden>{f.emoji}</span>
            {t(f.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
