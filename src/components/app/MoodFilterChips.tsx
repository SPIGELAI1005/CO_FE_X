import { useTranslation } from "react-i18next";
import { MOOD_OPTIONS, type MoodId } from "@/lib/mood-discovery";

interface MoodFilterChipsProps {
  value: MoodId | null;
  onChange: (mood: MoodId | null) => void;
}

export function MoodFilterChips({ value, onChange }: MoodFilterChipsProps) {
  const { t } = useTranslation();

  return (
    <div className="cofex-chip-scroll-row flex gap-2 pb-1">
      {MOOD_OPTIONS.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(value === m.id ? null : m.id)}
          className={`cofex-app-chip shrink-0 ${value === m.id ? "ring-2 ring-[color:var(--cofex-cyan)]" : ""}`}
        >
          {t(m.labelKey)}
        </button>
      ))}
    </div>
  );
}
