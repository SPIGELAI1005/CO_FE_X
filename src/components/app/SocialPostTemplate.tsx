import type { SocialPostPackage } from "@/lib/social-post-assistant";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SocialPostTemplateProps {
  shopName: string;
  coverImageUrl?: string | null;
  postPackage: SocialPostPackage;
  isStory?: boolean;
}

export function SocialPostTemplate({ shopName, coverImageUrl, postPackage, isStory }: SocialPostTemplateProps) {
  const { t } = useTranslation();
  const aspect = isStory ? "aspect-[9/16] max-h-[28rem]" : "aspect-square max-h-80";

  return (
    <div className="space-y-2">
      <div
        className={`relative mx-auto w-full max-w-[14rem] overflow-hidden rounded-3xl border-4 border-[color:var(--cofex-coffee-deep)] shadow-xl ${aspect}`}
      >
        {coverImageUrl ? (
          <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--cofex-coffee-deep)] via-[#4a2c1a] to-[color:var(--cofex-black)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

        <div className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-[color:var(--cofex-coffee-deep)] shadow">
          CO:FE(X)
        </div>

        <div className="absolute right-3 top-3 rounded-xl bg-[color:var(--cofex-accent-gold)] px-2 py-1 text-[9px] font-extrabold uppercase leading-tight text-[color:var(--cofex-coffee-deep)] shadow">
          {postPackage.slogan}
        </div>

        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 bg-white/20 text-4xl shadow-lg backdrop-blur-sm">
            {postPackage.drinkEmoji}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="text-lg font-extrabold leading-tight drop-shadow-md">{shopName}</p>
          {postPackage.locationSuggestion && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-white/90">
              <MapPin className="h-3 w-3 shrink-0" />
              {postPackage.locationSuggestion}
            </p>
          )}
          <p className="mt-2 line-clamp-2 text-[10px] font-medium text-white/80">{postPackage.drinkLabel}</p>
          <p className="mt-2 rounded-md bg-amber-500/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amber-950">
            {postPackage.disclosureShort}
          </p>
        </div>
      </div>
      <p className="text-center text-[10px] text-[color:var(--cofex-black)]/50">{t("socialAssistant.templateHint")}</p>
    </div>
  );
}
