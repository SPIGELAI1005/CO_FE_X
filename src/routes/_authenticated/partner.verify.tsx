import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ScanLine, Gift, Wallet } from "lucide-react";
import { PARTNER_BTN, PartnerStatusPill } from "@/components/app/partner/PartnerShell";
import { VerifyQrScanner } from "@/components/app/partner/VerifyQrScanner";
import { usePartnerVerifyAudit, useVerifyRedemptionCode } from "@/lib/queries/partner";

export const Route = createFileRoute("/_authenticated/partner/verify")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify code · CO:FE(X)" }] }),
  component: VerifyPage,
});

type VerifyResultCode =
  | "ok"
  | "already_used"
  | "not_found"
  | "not_yours"
  | "expired"
  | "invalid_token"
  | "rate_limited";

type VerifyResult = {
  result: VerifyResultCode;
  redemption_code: string;
  kind?: "campaign" | "wallet";
  campaign_title?: string;
  reward?: string | null;
  shop_name?: string;
  used_at?: string | null;
  expires_at?: string | null;
  points_awarded?: number;
};

type AuditRow = {
  id: string;
  code: string;
  result: string;
  verified_at: string;
  campaign_id: string | null;
};

function VerifyPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_authenticated/partner/verify" });
  const { user } = useUser();
  const auditQuery = usePartnerVerifyAudit(user?.id);
  const verifyMutation = useVerifyRedemptionCode(user?.id);
  const [code, setCode] = useState(search.code ?? "");
  const [latest, setLatest] = useState<VerifyResult | null>(null);
  const [tab, setTab] = useState<"scan" | "enter">("scan");

  const audit = (auditQuery.data?.rows ?? []) as AuditRow[];
  const remaining = auditQuery.data?.remaining ?? null;

  useEffect(() => {
    if (search.code) setCode(search.code);
  }, [search.code]);

  async function verify(inputCode?: string) {
    const raw = (inputCode ?? code).trim();
    if (!raw) return;
    try {
      const data = await verifyMutation.mutateAsync(raw);
      const result = data as unknown as VerifyResult;
      setLatest(result);
      if (result.result === "ok") {
        toast.success(
          result.kind === "wallet"
            ? t("partnerVerifyPage.catalogVerified")
            : t("partnerVerifyPage.codeVerified"),
        );
      } else if (result.result === "already_used") {
        toast.warning(t("partnerVerifyPage.alreadyRedeemedToast"));
      } else if (result.result === "expired") {
        toast.warning(t("partnerVerifyPage.expiredToast"));
      } else if (result.result === "gift_pending") {
        toast.warning(t("partnerVerifyPage.giftPending"));
      } else if (result.result === "invalid_token") {
        toast.error(t("partnerVerifyPage.invalidTokenToast"));
      } else if (result.result === "not_yours") {
        toast.error(t("partnerVerifyPage.wrongShopToast"));
      } else if (result.result === "not_found") {
        toast.error(t("partnerVerifyPage.codeNotFoundToast"));
      }
      if (!inputCode) setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("partnerVerifyPage.verificationFailed");
      toast.error(message.replace(/^.*?: /, ""));
      setLatest(null);
    }
  }

  const busy = verifyMutation.isPending;

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerVerify.eyebrow")}
        title={t("pages.partnerVerify.title")}
        subtitle={t("pages.partnerVerify.subtitle")}
      />
      <AppPageBody className="max-w-4xl pb-10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "scan" | "enter")} className="cofex-app-card p-5">
          <TabsList className="mb-4 grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="scan" className="gap-1.5">
              <ScanLine className="h-3.5 w-3.5" /> {t("pages.partnerVerify.scan")}
            </TabsTrigger>
            <TabsTrigger value="enter">{t("pages.partnerVerify.enterCode")}</TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-0">
            <VerifyQrScanner onCode={(c) => verify(c)} disabled={busy} />
          </TabsContent>

          <TabsContent value="enter" className="mt-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--cofex-black)]/35" />
                <Input
                  autoFocus={tab === "enter"}
                  placeholder={t("pages.partnerVerify.codePlaceholder")}
                  maxLength={24}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") verify();
                  }}
                  className="pl-9 font-mono text-lg uppercase tracking-[0.2em]"
                />
              </div>
              <Button onClick={() => verify()} disabled={busy || code.length < 4} className={PARTNER_BTN}>
                {busy ? t("pages.partnerVerify.verifying") : t("pages.partnerVerify.verify")}
              </Button>
            </div>
            <p className="mt-2 text-xs text-[color:var(--cofex-black)]/50">{t("partnerVerifyPage.manualHint")}</p>
          </TabsContent>

          {remaining !== null && (
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-[color:var(--cofex-black)]/55">
              <Clock className="h-3 w-3" /> {t("pages.partnerVerify.attemptsLeft", { remaining })}
            </p>
          )}
        </Tabs>

        {latest && <VerifyResultCard result={latest} />}

        <AppPageSection eyebrow={t("partnerVerifyPage.history")} title={t("pages.partnerVerify.auditLog")} className="mt-8">
          <div className="cofex-app-card overflow-hidden p-0">
            {auditQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-[color:var(--cofex-black)]/55">Loading…</div>
            ) : audit.length === 0 ? (
              <div className="p-6 text-center text-sm text-[color:var(--cofex-black)]/55">
                {t("partnerVerifyPage.noVerifications")}
              </div>
            ) : (
              audit.map((r) => <AuditRowItem key={r.id} row={r} />)
            )}
          </div>
        </AppPageSection>
      </AppPageBody>
    </AppPage>
  );
}

function VerifyResultCard({ result }: { result: VerifyResult }) {
  const { t, i18n } = useTranslation();
  const isWallet = result.kind === "wallet";
  const ok = result.result === "ok";
  const warn = result.result === "already_used" || result.result === "expired";
  const danger = !ok && !warn;

  const titleKey = `partnerVerifyPage.results.${result.result}` as const;

  return (
    <div
      className={`cofex-app-card mt-5 border-2 p-5 shadow-none ${
        ok
          ? "border-emerald-400 bg-emerald-50/80"
          : warn
            ? "border-amber-400 bg-amber-50/80"
            : "border-rose-400 bg-rose-50/80"
      }`}
    >
      <div className="flex items-start gap-3">
        {ok && <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />}
        {warn && <AlertTriangle className="h-8 w-8 shrink-0 text-amber-600" />}
        {danger && <XCircle className="h-8 w-8 shrink-0 text-rose-600" />}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">
              {t(titleKey, { defaultValue: result.result })}
            </div>
            {isWallet && (
              <PartnerStatusPill tone="info">
                <Wallet className="mr-0.5 inline h-3 w-3" /> {t("partnerVerifyPage.catalog")}
              </PartnerStatusPill>
            )}
          </div>

          {result.campaign_title && (
            <div className="mt-2 text-sm">
              <div className="font-semibold">{result.campaign_title}</div>
              {result.reward && (
                <div className="mt-1 inline-flex items-center gap-1 text-[color:var(--cofex-black)]/75">
                  <Gift className="h-3.5 w-3.5" /> {result.reward}
                </div>
              )}
              {isWallet && result.points_awarded != null && (
                <div className="mt-1 text-xs text-[color:var(--cofex-black)]/55">
                  {t("partnerVerifyPage.pointsSpent", { count: result.points_awarded })}
                </div>
              )}
            </div>
          )}

          {result.shop_name && (
            <div className="mt-1 text-xs text-[color:var(--cofex-black)]/55">{result.shop_name}</div>
          )}

          {result.expires_at && result.result === "expired" && (
            <div className="mt-2 text-xs text-[color:var(--cofex-black)]/55">
              {t("partnerVerifyPage.expiredOn", {
                date: new Date(result.expires_at).toLocaleString(i18n.language),
              })}
            </div>
          )}

          {result.used_at && (
            <div className="mt-2 text-xs text-[color:var(--cofex-black)]/55">
              {t("partnerVerifyPage.markedUsed", {
                time: new Date(result.used_at).toLocaleString(i18n.language),
              })}
            </div>
          )}

          <div className="mt-2 font-mono text-xs text-[color:var(--cofex-black)]/45">{result.redemption_code}</div>
        </div>
      </div>
    </div>
  );
}

function AuditRowItem({ row }: { row: AuditRow }) {
  const toneMap: Record<string, "success" | "warn" | "danger" | "neutral"> = {
    ok: "success",
    already_used: "warn",
    expired: "warn",
    invalid_token: "danger",
    not_found: "danger",
    not_yours: "danger",
    rate_limited: "neutral",
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3 text-sm last:border-0">
      <div className="flex items-center gap-3">
        <PartnerStatusPill tone={toneMap[row.result] ?? "neutral"}>{row.result.replaceAll("_", " ")}</PartnerStatusPill>
        <span className="font-mono text-[color:var(--cofex-black)]/75">{row.code}</span>
      </div>
      <span className="text-xs text-[color:var(--cofex-black)]/45">{new Date(row.verified_at).toLocaleString()}</span>
    </div>
  );
}
