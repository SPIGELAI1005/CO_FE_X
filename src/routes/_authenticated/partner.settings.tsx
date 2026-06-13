import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  usePartnerApiKeys,
  usePartnerReferrals,
  usePartnerReferralCode,
} from "@/lib/queries/partner";
import { PARTNER_BTN, PARTNER_CHIP, PARTNER_CHIP_ACTIVE, PartnerStatusPill } from "@/components/app/partner/PartnerShell";
import { Copy, Key, Link2, Loader2, Trash2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/settings")({
  head: () => ({ meta: [{ title: "Settings · Partner" }] }),
  component: PartnerSettingsPage,
});

function PartnerSettingsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const keysQuery = usePartnerApiKeys(user?.id);
  const referralsQuery = usePartnerReferrals(user?.id);
  const codeQuery = usePartnerReferralCode(user?.id);
  const [keyName, setKeyName] = useState("Counter integration");
  const [writeScope, setWriteScope] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  async function issueKey() {
    setBusy(true);
    const scopes = writeScope ? ["read", "write"] : ["read"];
    const { data, error } = await supabase.rpc("issue_api_key", { _name: keyName.trim() || "API key", _scopes: scopes });
    setBusy(false);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    const row = data as { api_key?: string };
    if (row.api_key) {
      setRevealedKey(row.api_key);
      toast.success("API key created. Copy it now — it won't be shown again.");
    }
    keysQuery.refetch();
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this API key?")) return;
    const { error } = await supabase.rpc("revoke_api_key", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Key revoked");
    keysQuery.refetch();
  }

  const referralCode = codeQuery.data;
  const referralLink =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/auth?ref=${referralCode}`
      : "";

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerSettings.eyebrow")}
        title={t("pages.partnerSettings.title")}
        subtitle={t("pages.partnerSettings.subtitle")}
      />
      <AppPageBody className="max-w-3xl space-y-8 pb-10">
        <AppPageSection eyebrow="API" title="API keys" subtitle="Requires Growth or Pro plan with API access.">
          <div className="cofex-app-card space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Key name</Label>
                <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="POS integration" />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={writeScope} onCheckedChange={setWriteScope} />
                  Write scope (Pro)
                </label>
              </div>
            </div>
            <Button onClick={issueKey} disabled={busy} className={PARTNER_BTN}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Key className="mr-1 h-4 w-4" />}
              Issue new key
            </Button>
            {revealedKey && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Copy now</div>
                <code className="mt-1 block break-all font-mono text-xs">{revealedKey}</code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 rounded-full"
                  onClick={() => {
                    void navigator.clipboard.writeText(revealedKey);
                    toast.success("Copied");
                  }}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" /> Copy key
                </Button>
              </div>
            )}
            {keysQuery.isLoading ? (
              <p className="text-sm text-[color:var(--cofex-black)]/55">Loading keys…</p>
            ) : (keysQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-[color:var(--cofex-black)]/55">No API keys yet.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--border)]">
                {(keysQuery.data ?? []).map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <div className="font-semibold">{k.name}</div>
                      <div className="text-xs text-[color:var(--cofex-black)]/45">
                        {k.key_prefix}… · {k.scopes.join(", ")} · {k.rate_limit_per_minute}/min
                      </div>
                    </div>
                    {k.revoked_at ? (
                      <PartnerStatusPill tone="neutral">Revoked</PartnerStatusPill>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => revokeKey(k.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AppPageSection>

        <AppPageSection eyebrow="Referrals" title="Partner referral program" subtitle="Share your code when onboarding other cafés.">
          <div className="cofex-app-card space-y-4 p-5">
            {codeQuery.isLoading ? (
              <p className="text-sm text-[color:var(--cofex-black)]/55">Loading…</p>
            ) : referralCode ? (
              <>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">Your code</div>
                  <div className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-[color:var(--cofex-coffee-deep)]">
                    {referralCode}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      void navigator.clipboard.writeText(referralCode);
                      toast.success("Code copied");
                    }}
                  >
                    <Copy className="mr-1 h-4 w-4" /> Copy code
                  </Button>
                  {referralLink && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        void navigator.clipboard.writeText(referralLink);
                        toast.success("Link copied");
                      }}
                    >
                      <Link2 className="mr-1 h-4 w-4" /> Copy signup link
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-[color:var(--cofex-black)]/55">Referral code unavailable.</p>
            )}

            {(referralsQuery.data ?? []).length > 0 && (
              <div className="border-t border-[color:var(--border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
                  <Users className="h-4 w-4" /> Referrals
                </div>
                <ul className="space-y-2 text-sm">
                  {(referralsQuery.data ?? []).map((r) => (
                    <li key={r.id} className="flex items-center justify-between">
                      <span className="text-[color:var(--cofex-black)]/65">Partner {r.referred_partner_id.slice(0, 8)}</span>
                      <PartnerStatusPill tone={r.status === "paid" ? "success" : "info"}>{r.status}</PartnerStatusPill>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AppPageSection>
      </AppPageBody>
    </AppPage>
  );
}
