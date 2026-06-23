import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Award,
  Bookmark,
  Heart,
  MapPin,
  Megaphone,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/app/OptimizedImage";
import { Button } from "@/components/ui/button";
import {
  momentAuthorLabel,
  momentDrinkEmoji,
  momentSourceLabelKey,
  type MomentFeedItem,
} from "@/lib/moments";

interface MomentFeedCardProps {
  item: MomentFeedItem;
  onLike: () => void;
  onSave: () => void;
  likeBusy?: boolean;
  saveBusy?: boolean;
}

export function MomentFeedCard({ item, onLike, onSave, likeBusy, saveBusy }: MomentFeedCardProps) {
  const { t } = useTranslation();
  const author = momentAuthorLabel(item);
  const image = item.image_url ?? item.shop_cover_url;
  const drinkEmoji = momentDrinkEmoji(item.drink_type);

  async function share() {
    const text = [
      item.campaign_slogan,
      item.caption,
      item.shop_name ? `${item.shop_name}${item.city ? ` · ${item.city}` : ""}` : null,
      "CO:FE(X)",
    ]
      .filter(Boolean)
      .join(" · ");
    try {
      if (navigator.share) {
        await navigator.share({ title: t("moments.shareTitle"), text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success(t("moments.copiedShare"));
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <article className="cofex-app-card overflow-hidden">
      <div className="relative aspect-[4/5] bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)]">
        {image ? (
          <OptimizedImage
            src={image}
            alt=""
            width={640}
            height={800}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">{drinkEmoji}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {item.campaign_slogan && (
          <span className="absolute right-3 top-3 max-w-[55%] rounded-xl bg-[color:var(--cofex-accent-gold)] px-2.5 py-1 text-[10px] font-extrabold uppercase leading-tight text-[color:var(--cofex-coffee-deep)] shadow">
            {item.campaign_slogan}
          </span>
        )}

        {item.badge_name && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[color:var(--cofex-coffee-deep)] shadow">
            <Award className="h-3 w-3 text-amber-600" />
            {item.badge_name}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2">
            {item.explorer_avatar && item.source_type !== "campaign_highlight" ? (
              <img
                src={item.explorer_avatar}
                alt=""
                className="h-9 w-9 rounded-full border-2 border-white/80 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-sm font-bold backdrop-blur">
                {author.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{author}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/75">
                {t(momentSourceLabelKey(item.source_type))}
              </p>
            </div>
            <span className="text-xl" aria-hidden>
              {drinkEmoji}
            </span>
          </div>

          {item.shop_name && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-white/90">
              <MapPin className="h-3 w-3 shrink-0" />
              {item.shop_slug ? (
                <Link to="/coffee/$slug" params={{ slug: item.shop_slug }} className="underline-offset-2 hover:underline">
                  {item.shop_name}
                  {item.city ? ` · ${item.city}` : ""}
                </Link>
              ) : (
                <>
                  {item.shop_name}
                  {item.city ? ` · ${item.city}` : ""}
                </>
              )}
            </p>
          )}

          {item.caption && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/85">{item.caption}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] px-3 py-2.5">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={likeBusy}
            onClick={onLike}
            className={`rounded-full gap-1.5 ${item.liked_by_me ? "text-rose-600" : ""}`}
          >
            <Heart className={`h-4 w-4 ${item.liked_by_me ? "fill-current" : ""}`} />
            <span className="text-xs font-semibold">{item.like_count}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saveBusy}
            onClick={onSave}
            className={`rounded-full gap-1.5 ${item.saved_by_me ? "text-[color:var(--cofex-cyan)]" : ""}`}
          >
            <Bookmark className={`h-4 w-4 ${item.saved_by_me ? "fill-current" : ""}`} />
            <span className="text-xs font-semibold">{item.save_count}</span>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {item.campaign_id && (
            <Button type="button" variant="ghost" size="icon" className="rounded-full" asChild>
              <Link to="/campaign/$id" params={{ id: item.campaign_id }}>
                <Megaphone className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={share}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function MomentsEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="cofex-app-card flex flex-col items-center px-6 py-12 text-center">
      <Sparkles className="h-10 w-10 text-[color:var(--cofex-cyan)]" />
      <p className="mt-3 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{t("moments.emptyTitle")}</p>
      <p className="mt-1 max-w-sm text-sm text-[color:var(--cofex-black)]/60">{t("moments.emptyDescription")}</p>
    </div>
  );
}
