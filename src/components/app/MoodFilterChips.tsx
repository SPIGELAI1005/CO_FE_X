import type { MoodId } from "@/lib/mood-discovery";
import { MOOD_OPTIONS } from "@/lib/mood-discovery";
import { useTranslation } from "react-i18next";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { MOOD_ICON_META } from "@/lib/explorer-section-icons";

interface MoodFilterChipsProps {
  value: MoodId | null;
  onChange: (mood: MoodId | null) => void;
}

export function MoodFilterChips({ value, onChange }: MoodFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="cofex-chip-scroll-row items-center">
      {MOOD_OPTIONS.map((m) => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(active ? null : m.id)}
            aria-pressed={active}
            className={`cofex-app-chip inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              active ? "cofex-app-chip-active" : ""
            }`}
          >
            <CofexIconTile meta={MOOD_ICON_META[m.id]} size="xs" />
            {t(m.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
