import { useTranslation } from "react-i18next";
import { BEVERAGE_TAGS } from "@/lib/beverage-tags";
import { CofexIconTile } from "@/components/app/CofexIconTile";

interface BeveragePickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function BeveragePicker({ value, onChange }: BeveragePickerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      {BEVERAGE_TAGS.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => onChange(b.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
            value === b.id
              ? "bg-[color:var(--cofex-coffee-deep)] text-white shadow-sm"
              : "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/70 hover:bg-[color:var(--cofex-pastel-blue)]/40"
          }`}
        >
          <CofexIconTile rewardType={b.id} size="xs" />
          {t(b.labelKey)}
        </button>
      ))}
    </div>
  );
}
