import { MAP_THEMES, type MapThemeId } from "@/lib/map-themes";
import { useTranslation } from "react-i18next";

export function MapThemeToggle({
  value,
  onChange,
  disabled,
}: {
  value: MapThemeId;
  onChange: (id: MapThemeId) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      {MAP_THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(theme.id)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            value === theme.id
              ? "bg-[color:var(--cofex-coffee-deep)] text-white"
              : "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/70"
          }`}
        >
          {t(theme.labelKey)}
        </button>
      ))}
    </div>
  );
}
