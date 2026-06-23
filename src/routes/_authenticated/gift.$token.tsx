import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Gift, Heart, Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppPage, AppPageBody } from "@/components/app/AppPageShell";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { Button } from "@/components/ui/button";
import { useAcceptRewardGift, useRewardGiftPreview } from "@/lib/queries/reward-gifts";

export const Route = createFileRoute("/_authenticated/gift/$token")({
  head: () => ({ meta: [{ title: "Gift · CO:FE(X)" }] }),
  component: GiftAcceptPage,
});

function GiftAcceptPage() {
  const { token } = Route.useParams();
  const { t } = useTranslation();
  const previewQuery = useRewardGiftPreview(token);
  const acceptGift = useAcceptRewardGift();

  async function accept() {
    try {
      const res = await acceptGift.mutateAsync(token);
      toast.success(t("rewardGift.acceptedCelebrate"));
      window.location.href = `/campaign/${res.campaign_id}`;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("rewardGift.acceptFailed"));
    }
  }

  return (
    <AppPage>
      <AppPageBody className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
        <QueryBoundary query={previewQuery} loadingLabel={t("rewardGift.loading")}>
          {(gift) => {
            if (!gift) {
              return (
                <div className="cofex-app-card p-8 text-center">
                  <p className="font-semibold text-[color:var(--cofex-coffee-deep)]">{t("rewardGift.notFound")}</p>
                </div>
              );
            }

            return (
              <div className="cofex-app-card overflow-hidden">
                <div className="bg-gradient-to-br from-rose-500 via-amber-400 to-[color:var(--cofex-accent-gold)] px-6 py-8 text-center text-white">
                  <Gift className="mx-auto h-10 w-10" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/80">
                    {t("rewardGift.acceptEyebrow")}
                  </p>
                  <h1 className="mt-2 text-2xl font-extrabold">{t("rewardGift.acceptTitle")}</h1>
                  <p className="mt-2 text-sm text-white/90">
                    {t("rewardGift.fromSomeone", { name: gift.sender_name })}
                  </p>
                </div>

                <div className="space-y-4 p-6">
                  {gift.message ? (
                    <blockquote className="rounded-xl bg-rose-50 px-4 py-3 text-center text-sm italic text-rose-800">
                      &ldquo;{gift.message}&rdquo;
                    </blockquote>
                  ) : null}

                  <div className="rounded-xl bg-[color:var(--cofex-cream)]/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">
                      {t("rewardGift.rewardLabel")}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{gift.campaign_title}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-[color:var(--cofex-black)]/65">
                      <MapPin className="h-3.5 w-3.5" /> {gift.shop_name}
                    </p>
                    {gift.reward_description ? (
                      <p className="mt-2 text-sm text-amber-900/80">{gift.reward_description}</p>
                    ) : null}
                  </div>

                  {gift.status === "accepted" ? (
                    <div className="text-center">
                      <Sparkles className="mx-auto h-6 w-6 text-emerald-500" />
                      <p className="mt-2 font-semibold text-emerald-700">{t("rewardGift.alreadyAccepted")}</p>
                      <Button asChild className="mt-4 w-full rounded-full">
                        <Link to="/campaign/$id" params={{ id: gift.campaign_id }}>
                          {t("rewardGift.viewReward")}
                        </Link>
                      </Button>
                    </div>
                  ) : gift.status === "cancelled" ? (
                    <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("rewardGift.cancelledHint")}</p>
                  ) : gift.is_sender ? (
                    <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("rewardGift.ownGiftHint")}</p>
                  ) : gift.can_accept ? (
                    <>
                      <p className="text-center text-xs text-[color:var(--cofex-black)]/50">{t("rewardGift.restrictionsNote")}</p>
                      <Button
                        type="button"
                        className="w-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 py-6 text-base font-bold"
                        disabled={acceptGift.isPending}
                        onClick={accept}
                      >
                        {acceptGift.isPending ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <Heart className="mr-2 h-5 w-5" />
                        )}
                        {t("rewardGift.acceptBtn")}
                      </Button>
                    </>
                  ) : (
                    <p className="text-center text-sm text-[color:var(--cofex-black)]/55">{t("rewardGift.notForYou")}</p>
                  )}
                </div>
              </div>
            );
          }}
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}
