import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Inbox, Loader2, Megaphone } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { PARTNER_CHIP, PARTNER_CHIP_ACTIVE } from "@/components/app/partner/PartnerShell";
import { SocialProofReviewCard } from "@/components/app/partner/SocialProofReviewCard";
import {
  usePartnerSocialProofSignedUrls,
  usePartnerSocialSubmissionCounts,
  usePartnerSocialSubmissions,
  useReviewSocialSubmission,
  type SocialSubmissionStatus,
} from "@/lib/queries/partner-submissions";

export const Route = createFileRoute("/_authenticated/partner/submissions")({
  head: () => ({ meta: [{ title: "Social submissions · Partner" }] }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SocialSubmissionStatus>("pending");
  const submissionsQuery = usePartnerSocialSubmissions(tab);
  const countsQuery = usePartnerSocialSubmissionCounts();
  const reviewMutation = useReviewSocialSubmission(tab);

  const screenshotPaths = useMemo(
    () =>
      (submissionsQuery.data ?? [])
        .map((s) => s.screenshot_path)
        .filter((p): p is string => !!p),
    [submissionsQuery.data],
  );
  const signedUrlsQuery = usePartnerSocialProofSignedUrls(screenshotPaths);
  const signedUrls = signedUrlsQuery.data ?? {};

  async function review(id: string, decision: "approved" | "rejected", notes?: string) {
    try {
      const result = await reviewMutation.mutateAsync({ submissionId: id, decision, notes });
      if (decision === "approved") {
        const code = (result as { redemption_code?: string })?.redemption_code;
        toast.success(
          code
            ? t("partnerSubmissionsReview.toastApprovedWithCode", { code })
            : t("partnerSubmissionsReview.toastApproved"),
        );
      } else {
        toast.success(t("partnerSubmissionsReview.toastRejected"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("partnerSubmissionsReview.toastError"));
    }
  }

  const items = submissionsQuery.data ?? [];
  const loading = submissionsQuery.isLoading;
  const counts = countsQuery.data;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerSubmissions.eyebrow")}
        title={t("pages.partnerSubmissions.title")}
        subtitle={t("pages.partnerSubmissions.subtitle")}
      />
      <AppPageBody className="max-w-3xl pb-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setTab(status)}
              className={tab === status ? PARTNER_CHIP_ACTIVE : PARTNER_CHIP}
            >
              {t(`submissionsPage.${status}`)}
              {counts ? ` (${counts[status]})` : ""}
            </button>
          ))}
        </div>

        {submissionsQuery.isError ? (
          <div className="cofex-app-card border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
            {submissionsQuery.error instanceof Error
              ? submissionsQuery.error.message
              : t("submissionsPage.loadError")}
          </div>
        ) : loading ? (
          <div className="py-12 text-center text-sm text-[color:var(--cofex-black)]/55">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> {t("submissionsPage.loading")}
          </div>
        ) : items.length === 0 ? (
          <div className="cofex-app-card cofex-app-card-dashed p-12 text-center shadow-none">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-[color:var(--cofex-black)]/25" />
            <p className="text-sm text-[color:var(--cofex-black)]/55">
              {t("submissionsPage.empty", { tab: t(`submissionsPage.${tab}`) })}
            </p>
            {tab === "pending" && (
              <p className="mt-2 text-xs text-[color:var(--cofex-black)]/45">{t("submissionsPage.emptyPendingHint")}</p>
            )}
            {tab === "pending" && (counts?.approved ?? 0) > 0 && (
              <p className="mt-2 text-xs font-medium text-emerald-800">
                {t("submissionsPage.checkApprovedTab", { count: counts?.approved ?? 0 })}
              </p>
            )}
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/partner/campaigns">
                <Megaphone className="mr-1 h-4 w-4" /> {t("submissionsPage.viewCampaigns")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((s) => (
              <SocialProofReviewCard
                key={s.id}
                submission={s}
                signedUrl={s.screenshot_path ? signedUrls[s.screenshot_path] : undefined}
                onReview={review}
              />
            ))}
          </div>
        )}
      </AppPageBody>
    </AppPage>
  );
}
