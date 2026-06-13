import { useTranslation } from "react-i18next";
import { setAppLocale, type AppLocale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const locale: AppLocale = i18n.language?.startsWith("de") ? "de" : "en";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-2 text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-coffee-deep)] hover:bg-zinc-100"
          aria-label={t("language.label")}
        >
          {locale === "de" ? "DE" : "EN"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        <DropdownMenuItem
          onClick={() => setAppLocale("en")}
          className={locale === "en" ? "font-semibold text-[color:var(--cofex-coffee-deep)]" : ""}
        >
          EN · {t("language.en")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setAppLocale("de")}
          className={locale === "de" ? "font-semibold text-[color:var(--cofex-coffee-deep)]" : ""}
        >
          DE · {t("language.de")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
