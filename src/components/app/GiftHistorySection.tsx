import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Gift, Heart } from "lucide-react";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useRewardGiftHistory } from "@/lib/queries/reward-gifts";
import { rewardGiftUrl } from "@/lib/reward-gifts";

export function GiftHistorySection() {
  const { t } = useTranslation();
  const historyQuery = useRewardGiftHistory();

  return (
    <QueryBoundary query={historyQuery} loadingLabel={t("rewardGift.historyLoading")}>
      {({ sent, received }) => {
        if (sent.length === 0 && received.length === 0) {
          return (
            <div className="cofex-app-card p-5 text-center">
              <Gift className="mx-auto h-8 w-8 text-rose-300" />
              <p className="mt-2 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">{t("rewardGift.historyEmpty")}</p>
              <p className="mt-1 text-xs text-[color:var(--cofex-black)]/50">{t("rewardGift.historyEmptyHint")}</p>
            </div>
          );
        }

        return (
          <div className="space-y-4">
            {received.length > 0 && (
              <GiftList title={t("rewardGift.receivedTitle")} items={received} kind="received" />
            )}
            {sent.length > 0 && <GiftList title={t("rewardGift.sentTitle")} items={sent} kind="sent" />}
          </div>
        );
      }}
    </QueryBoundary>
  );
}

function GiftList({
  title,
  items,
  kind,
}: {
  title: string;
  items: Array<{
    id: string;
    gift_token: string;
    status: string;
    campaign_title: string;
    shop_name: string;
    message?: string | null;
    sender_name?: string;
    recipient_name?: string;
    created_at: string;
  }>;
  kind: "sent" | "received";
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="cofex-app-card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--cofex-coffee-deep)]/70">{title}</p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-[color:var(--cofex-cream)]/50 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">{item.campaign_title}</p>
                <p className="text-xs text-[color:var(--cofex-black)]/55">{item.shop_name}</p>
                <p className="mt-1 text-[11px] text-[color:var(--cofex-black)]/45">
                  {kind === "sent"
                    ? t("rewardGift.toSomeone", { name: item.recipient_name ?? t("rewardGift.linkRecipient") })
                    : t("rewardGift.fromSomeone", { name: item.sender_name ?? t("rewardGift.aFriend") })}
                </p>
                {item.message ? (
                  <p className="mt-1 text-xs italic text-rose-600/80">&ldquo;{item.message}&rdquo;</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  item.status === "accepted"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {t(`rewardGift.status.${item.status}`)}
              </span>
            </div>
            {item.status === "pending" && kind === "received" && (
              <Link
                to="/gift/$token"
                params={{ token: item.gift_token }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"
              >
                <Heart className="h-3 w-3" /> {t("rewardGift.acceptCta")}
              </Link>
            )}
            {item.status === "pending" && kind === "sent" && (
              <button
                type="button"
                className="mt-2 text-[11px] font-semibold text-[color:var(--cofex-cyan)] hover:underline"
                onClick={() => void navigator.clipboard.writeText(rewardGiftUrl(item.gift_token))}
              >
                {t("rewardGift.copyLink")}
              </button>
            )}
            <p className="mt-1 text-[10px] text-[color:var(--cofex-black)]/35">
              {new Date(item.created_at).toLocaleDateString(i18n.language, { month: "short", day: "numeric" })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
