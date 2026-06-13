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



type VerifyResult = {

  result: "ok" | "already_used" | "not_found" | "not_yours" | "rate_limited";

  redemption_code: string;

  kind?: "campaign" | "wallet";

  campaign_title?: string;

  reward?: string | null;

  shop_name?: string;

  used_at?: string | null;

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

      const result = data as VerifyResult;

      setLatest(result);

      if (result.result === "ok") {

        toast.success(result.kind === "wallet" ? "Catalog reward verified" : "Code verified");

      } else if (result.result === "already_used") {

        toast.warning("Code already redeemed");

      }

      if (!inputCode) setCode("");

    } catch (err) {

      const message = err instanceof Error ? err.message : "Verification failed";

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

              <ScanLine className="h-3.5 w-3.5" /> Scan

            </TabsTrigger>

            <TabsTrigger value="enter">Enter code</TabsTrigger>

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

                  placeholder="Enter 8-character code"

                  maxLength={16}

                  value={code}

                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}

                  onKeyDown={(e) => {

                    if (e.key === "Enter") verify();

                  }}

                  className="pl-9 font-mono text-lg uppercase tracking-[0.3em]"

                />

              </div>

              <Button onClick={() => verify()} disabled={busy || code.length < 4} className={PARTNER_BTN}>

                {busy ? "Verifying…" : "Verify"}

              </Button>

            </div>

          </TabsContent>



          {remaining !== null && (

            <p className="mt-3 inline-flex items-center gap-1 text-xs text-[color:var(--cofex-black)]/55">

              <Clock className="h-3 w-3" /> {remaining} of 60 attempts left this hour

            </p>

          )}

        </Tabs>



        {latest && <VerifyResultCard result={latest} />}



        <AppPageSection eyebrow="History" title="Audit log" className="mt-8">

          <div className="cofex-app-card overflow-hidden p-0">

            {auditQuery.isLoading ? (

              <div className="p-6 text-center text-sm text-[color:var(--cofex-black)]/55">Loading…</div>

            ) : audit.length === 0 ? (

              <div className="p-6 text-center text-sm text-[color:var(--cofex-black)]/55">No verifications yet.</div>

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

  const isWallet = result.kind === "wallet";

  const ok = result.result === "ok";



  return (

    <div

      className={`cofex-app-card mt-5 border-2 p-5 shadow-none ${

        ok

          ? "border-emerald-400 bg-emerald-50/80"

          : result.result === "already_used"

            ? "border-amber-400 bg-amber-50/80"

            : "border-rose-400 bg-rose-50/80"

      }`}

    >

      <div className="flex items-start gap-3">

        {ok && <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />}

        {result.result === "already_used" && <AlertTriangle className="h-8 w-8 shrink-0 text-amber-600" />}

        {(result.result === "not_found" || result.result === "not_yours") && (

          <XCircle className="h-8 w-8 shrink-0 text-rose-600" />

        )}

        <div className="flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <div className="text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">

              {ok && (isWallet ? "Catalog reward confirmed" : "Redemption confirmed")}

              {result.result === "already_used" && "Already redeemed"}

              {result.result === "not_found" && "Code not found"}

              {result.result === "not_yours" && "Code belongs to another café"}

            </div>

            {isWallet && (

              <PartnerStatusPill tone="info">

                <Wallet className="mr-0.5 inline h-3 w-3" /> Catalog

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

                  {result.points_awarded} points spent from wallet

                </div>

              )}

            </div>

          )}

          {result.shop_name && (

            <div className="mt-1 text-xs text-[color:var(--cofex-black)]/55">{result.shop_name}</div>

          )}

          {result.used_at && (

            <div className="mt-2 text-xs text-[color:var(--cofex-black)]/55">

              Marked used at {new Date(result.used_at).toLocaleString()}

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

    not_found: "danger",

    not_yours: "danger",

    rate_limited: "neutral",

  };

  return (

    <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3 text-sm last:border-0">

      <div className="flex items-center gap-3">

        <PartnerStatusPill tone={toneMap[row.result] ?? "neutral"}>{row.result.replace("_", " ")}</PartnerStatusPill>

        <span className="font-mono text-[color:var(--cofex-black)]/75">{row.code}</span>

      </div>

      <span className="text-xs text-[color:var(--cofex-black)]/45">{new Date(row.verified_at).toLocaleString()}</span>

    </div>

  );

}

