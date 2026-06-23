import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Coffee,
  Sparkles,
  Gift,
  Users,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Megaphone,
  Share2,
  MessageSquareText,
  Download,
  Calendar,
  Hourglass,
  History,
  AlertTriangle,
} from "lucide-react";
import { EmptyState } from "@/components/patterns/EmptyState";
import { RewardCatalogIcon } from "@/components/app/RewardCatalogIcon";
import { WalletRewardQr } from "@/components/app/WalletRewardQr";
import { GiftHistorySection } from "@/components/app/GiftHistorySection";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { useUser } from "@/hooks/use-user";
import {
  useWallet,
  usePointsLedger,
  useRedeemCatalogItem,
  useClaimReferral,
  useSetPointsExpiration,
  type CatalogItem,
  type LedgerEntry,
} from "@/lib/queries/wallet";

export const Route = createFileRoute("/_authenticated/_explorer/wallet")({
  head: () => ({ meta: [{ title: "Wallet · CO:FE(X)" }] }),
  component: WalletPage,
});

const EXPIRY_VALUES = ["off", "90", "180", "365", "730"] as const;

function useWalletSources() {
  const { t } = useTranslation();
  return useMemo(
    () =>
      ({
        check_in: {
          label: t("walletPage.sources.check_in"),
          Icon: Coffee,
          color: "text-[color:var(--cofex-coffee-deep)] bg-[color:var(--cofex-cream)]",
        },
        review: {
          label: t("walletPage.sources.review"),
          Icon: MessageSquareText,
          color: "text-[color:var(--cofex-cyan)] bg-[color:var(--cofex-pastel-blue)]",
        },
        campaign_redemption: {
          label: t("walletPage.sources.campaign_redemption"),
          Icon: Megaphone,
          color: "text-fuchsia-700 bg-fuchsia-50",
        },
        social_post: {
          label: t("walletPage.sources.social_post"),
          Icon: Share2,
          color: "text-rose-700 bg-rose-50",
        },
        referral_bonus: {
          label: t("walletPage.sources.referral_bonus"),
          Icon: Users,
          color: "text-emerald-700 bg-emerald-50",
        },
        referral_reward: {
          label: t("walletPage.sources.referral_reward"),
          Icon: Users,
          color: "text-emerald-700 bg-emerald-50",
        },
        catalog_redemption: {
          label: t("walletPage.sources.catalog_redemption"),
          Icon: Gift,
          color: "text-[color:var(--cofex-black)]/70 bg-[color:var(--cofex-cream)]",
        },
        challenge_reward: {
          label: t("walletPage.sources.challenge_reward"),
          Icon: Sparkles,
          color: "text-violet-700 bg-violet-50",
        },
        time_bonus: {
          label: t("walletPage.sources.time_bonus"),
          Icon: Sparkles,
          color: "text-amber-700 bg-amber-50",
        },
        crawl_complete: {
          label: t("walletPage.sources.crawl_complete"),
          Icon: Coffee,
          color: "text-emerald-700 bg-emerald-50",
        },
      }) as Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }>,
    [t],
  );
}

function WalletPage() {
  const { t } = useTranslation();
  const sourceMeta = useWalletSources();
  const expiryOptions = useMemo(
    () => EXPIRY_VALUES.map((value) => ({ value, label: t(`walletPage.expiry.${value}`) })),
    [t],
  );
  const { user } = useUser();
  const walletQuery = useWallet(user?.id);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ledgerQuery = usePointsLedger(user?.id, from, to);
  const redeemMutation = useRedeemCatalogItem(user?.id);
  const claimMutation = useClaimReferral(user?.id);
  const expiryMutation = useSetPointsExpiration(user?.id);

  const [claimInput, setClaimInput] = useState("");
  const [copied, setCopied] = useState(false);

  const wallet = walletQuery.data;
  const ledger = ledgerQuery.data ?? [];
  const balance = wallet?.balance ?? 0;

  async function redeem(item: CatalogItem) {
    if (balance < item.cost_points) return toast.error(t("walletPage.toastNeedMore", { count: item.cost_points - balance }));
    try {
      const data = await redeemMutation.mutateAsync(item.id);
      toast.success(t("walletPage.toastRewardUnlocked", { name: data.item ?? item.name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("walletPage.toastRedemptionFailed"));
    }
  }

  async function claim() {
    if (!claimInput.trim()) return;
    try {
      await claimMutation.mutateAsync(claimInput);
      toast.success(t("walletPage.toastReferralClaimed"));
      setClaimInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("walletPage.toastClaimFailed"));
    }
  }

  async function updateExpiry(val: string) {
    const days = val === "off" ? null : Number(val);
    try {
      await expiryMutation.mutateAsync(days);
      toast.success(days ? t("walletPage.toastExpirationSet", { days }) : t("walletPage.toastExpirationOff"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("walletPage.toastUpdateFailed"));
    }
  }

  function copyCode() {
    if (!wallet?.referralCode) return;
    navigator.clipboard.writeText(wallet.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportCsv(entries: LedgerEntry[]) {
    if (entries.length === 0) return toast.error(t("walletPage.toastNothingToExport"));
    const rows = [
      [
        t("walletPage.csvDate"),
        t("walletPage.csvSource"),
        t("walletPage.csvDelta"),
        t("walletPage.csvBalanceAfter"),
        t("walletPage.csvExpiresAt"),
        t("walletPage.csvReference"),
      ],
    ];
    entries.forEach((l) =>
      rows.push([
        new Date(l.created_at).toISOString(),
        sourceMeta[l.source]?.label ?? l.source,
        String(l.delta),
        String(l.balance_after),
        l.expires_at ? new Date(l.expires_at).toISOString() : "",
        JSON.stringify(l.metadata ?? {}),
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cofex-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    const earned = ledger.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
    const spent = ledger.filter((l) => l.delta < 0).reduce((s, l) => s + Math.abs(l.delta), 0);
    return { earned, spent };
  }, [ledger]);

  const expiringSoon = useMemo(
    () =>
      (wallet?.expiring ?? [])
        .filter((b) => b.bucket === "7d" || b.bucket === "30d")
        .reduce((s, b) => s + Number(b.amount), 0),
    [wallet?.expiring],
  );

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.wallet.eyebrow")}
        title={t("pages.wallet.title")}
        subtitle={t("pages.wallet.subtitle")}
      />
      <AppPageBody className="mx-auto max-w-3xl space-y-2 pb-8">
        <QueryBoundary query={walletQuery} loadingLabel={t("walletPage.loading")}>
          {(w) => (
            <>
              <div className="cofex-app-card relative overflow-hidden p-6 text-white" style={{ background: "var(--gradient-coffee)" }}>
                <div className="absolute -top-10 -right-10 text-[200px] leading-none opacity-10 select-none">☕</div>
                <div className="relative">
                  <div className="flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase opacity-80">
                    <Wallet className="h-3 w-3" /> {t("walletPage.title")}
                  </div>
                  <div className="mt-3 text-5xl font-extrabold tracking-tight tabular-nums">
                    {w.balance.toLocaleString()}
                    <span className="ml-2 text-base font-medium opacity-70">{t("walletPage.pts")}</span>
                  </div>
                  <div className="mt-1 text-xs opacity-80">{t("walletPage.currencyHint")}</div>
                  {w.beansBalance > 0 && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                      🫘 {t("walletPage.beansBalance", { count: w.beansBalance })}
                    </div>
                  )}
                  {expiringSoon > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      <AlertTriangle className="h-3 w-3" /> {t("walletPage.expiringSoon", { count: expiringSoon.toLocaleString() })}
                    </div>
                  )}
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <Earn Icon={Coffee} label={t("walletPage.earnCheckIn")} pts={10} />
                    <Earn Icon={MessageSquareText} label={t("walletPage.earnReview")} pts={5} />
                    <Earn Icon={Share2} label={t("walletPage.earnSocialPost")} pts={25} />
                    <Earn Icon={Megaphone} label={t("walletPage.earnCampaign")} pts={t("walletPage.earnVaries")} />
                    <Earn Icon={Users} label={t("walletPage.earnReferFriend")} pts={100} />
                    <Earn Icon={Users} label={t("walletPage.earnGetReferred")} pts={50} />
                  </div>
                </div>
              </div>

              <AppPageSection
                eyebrow={t("walletPage.settings")}
                title={t("walletPage.pointExpiration")}
                subtitle={t("walletPage.expirationHint")}
                icon={<Hourglass className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
                action={
                  <Select value={w.expireDays} onValueChange={updateExpiry} disabled={expiryMutation.isPending}>
                    <SelectTrigger className="w-full rounded-full border-[color:var(--border)] sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expiryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                {w.expiring.length > 0 && (
                  <div className="cofex-app-card p-4">
                    <div className="mb-2 text-[11px] font-semibold tracking-wider text-[color:var(--cofex-black)]/55 uppercase">
                      {t("walletPage.expirationTimeline")}
                    </div>
                    <div className="space-y-1.5">
                      {w.expiring.slice(0, 8).map((b, i) => {
                        const isExpired = b.bucket === "expired";
                        const isSoon = b.bucket === "7d" || b.bucket === "30d";
                        const date = new Date(b.expires_at);
                        return (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                              isExpired
                                ? "bg-rose-50 text-rose-900"
                                : isSoon
                                  ? "bg-amber-50 text-amber-900"
                                  : "bg-[color:var(--cofex-cream)]/60 text-[color:var(--cofex-black)]/75"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 opacity-70" />
                              <span>{date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                              {isExpired && <span className="text-[10px] font-bold uppercase">{t("walletPage.expired")}</span>}
                              {isSoon && !isExpired && <span className="text-[10px] font-bold uppercase">{t("walletPage.soon")}</span>}
                            </div>
                            <span className="font-bold tabular-nums">{Number(b.amount).toLocaleString()} {t("walletPage.pts")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </AppPageSection>

              <AppPageSection
                eyebrow={t("walletPage.spendPoints")}
                title={t("walletPage.redeemRewards")}
                icon={<Gift className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
                action={
                  <span className="text-xs text-[color:var(--cofex-black)]/55">{t("walletPage.balance", { count: w.balance.toLocaleString() })}</span>
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  {w.catalog.map((item) => {
                    const can = w.balance >= item.cost_points;
                    const isPremium = item.tier === "premium";
                    const busy = redeemMutation.isPending && redeemMutation.variables === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`cofex-app-card p-4 transition hover:-translate-y-0.5 ${
                          isPremium ? "bg-gradient-to-br from-amber-50 to-orange-100 ring-2 ring-[color:var(--cofex-accent-gold)]/40" : ""
                        }`}
                      >
                        <RewardCatalogIcon item={item} />
                        <div className="mt-3 font-bold text-[color:var(--cofex-coffee-deep)]">{item.name}</div>
                        {item.description && (
                          <div className="mt-0.5 text-xs leading-snug text-[color:var(--cofex-black)]/60">{item.description}</div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-sm font-bold text-[color:var(--cofex-coffee-deep)]">{item.cost_points} {t("walletPage.pts")}</span>
                          {isPremium && (
                            <span className="rounded-full bg-[color:var(--cofex-coffee-deep)] px-2 py-0.5 text-[9px] font-bold tracking-widest text-white uppercase">
                              {t("walletPage.premium")}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={() => redeem(item)}
                          disabled={!can || busy}
                          size="sm"
                          className="mt-3 w-full rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)] disabled:bg-[color:var(--cofex-cream)] disabled:text-[color:var(--cofex-black)]/50 disabled:opacity-100"
                        >
                          {busy ? t("walletPage.redeeming") : can ? t("walletPage.redeem") : t("walletPage.needMore", { count: item.cost_points - w.balance })}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </AppPageSection>

              <AppPageSection title={t("walletPage.redemptionHistory")} icon={<History className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}>
                {w.redemptions.length === 0 ? (
                  <EmptyState
                    icon={Gift}
                    title={t("walletPage.noRedemptions")}
                    description={t("walletPage.noRedemptionsHint")}
                  />
                ) : (
                  <div className="cofex-app-card divide-y overflow-hidden">
                    {w.redemptions.map((r) => {
                      const item = w.catalog.find((c) => c.id === r.catalog_id);
                      const status = r.used_at ? "used" : "active";
                      return (
                        <div key={r.id} className="p-3">
                          <div className="flex items-center gap-3">
                          <RewardCatalogIcon item={item ?? { name: t("walletPage.rewardFallback"), tier: null }} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-[color:var(--cofex-coffee-deep)]">
                                {item?.name ?? t("walletPage.rewardFallback")}
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                  status === "used"
                                    ? "bg-[color:var(--cofex-cream)] text-[color:var(--cofex-black)]/70"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {status === "used" ? t("walletPage.statusUsed") : t("walletPage.statusActive")}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-[color:var(--cofex-black)]/55">
                              {status === "used"
                                ? t("walletPage.usedAt", { time: new Date(r.used_at!).toLocaleString() })
                                : t("walletPage.issuedAt", { date: new Date(r.created_at).toLocaleDateString() })}
                              {" · "}
                              {t("walletPage.ptsSpentLine", { count: r.points_spent })}
                            </div>
                          </div>
                          </div>
                          {status === "active" ? (
                            <div className="mt-3">
                              <WalletRewardQr redemptionCode={r.redemption_code} itemName={item?.name ?? t("walletPage.rewardFallback")} />
                            </div>
                          ) : (
                            <div className="mt-2 font-mono text-xs font-bold tracking-[0.2em] text-[color:var(--cofex-black)]/55">
                              {r.redemption_code}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AppPageSection>

              <section className="cofex-app-card-dashed cofex-app-card mt-8 border-2 border-dashed p-5">
                <div className="flex items-center gap-2 font-bold text-[color:var(--cofex-coffee-deep)]">
                  <Users className="h-5 w-5 text-[color:var(--cofex-cyan)]" /> {t("walletPage.referFriends")}
                </div>
                <p className="mt-1 text-xs text-[color:var(--cofex-black)]/65">{t("walletPage.referHintFull")}</p>
                {w.referralCode && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 rounded-xl border-2 border-[color:var(--cofex-accent-gold)] bg-white px-4 py-2 text-center font-mono text-lg font-bold tracking-[0.3em] text-[color:var(--cofex-coffee-deep)]">
                      {w.referralCode}
                    </div>
                    <Button onClick={copyCode} size="sm" variant="outline" className="rounded-full border-[color:var(--cofex-accent-gold)]">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {!w.referredBy && (
                  <div className="mt-4 border-t border-[color:var(--border)] pt-4">
                    <div className="mb-1.5 text-xs text-[color:var(--cofex-black)]/65">{t("walletPage.haveCode")}</div>
                    <div className="flex gap-2">
                      <Input
                        value={claimInput}
                        onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
                        placeholder={t("walletPage.codePlaceholder")}
                        className="rounded-full bg-white text-center font-mono tracking-widest uppercase"
                        maxLength={12}
                      />
                      <Button
                        onClick={claim}
                        disabled={!claimInput.trim() || claimMutation.isPending}
                        className="rounded-full bg-[color:var(--cofex-coffee-deep)] hover:bg-[color:var(--cofex-black)]"
                      >
                        {t("walletPage.claimReferral")}
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </QueryBoundary>

        <AppPageSection
          title={t("walletPage.activityLedger")}
          icon={<Sparkles className="h-5 w-5 text-[color:var(--cofex-cyan)]" />}
          action={
            <Button onClick={() => exportCsv(ledger)} size="sm" variant="outline" className="h-8 rounded-full text-xs">
              <Download className="mr-1 h-3.5 w-3.5" /> {t("walletPage.exportCsv")}
            </Button>
          }
        >
          <div className="cofex-app-card mb-2 flex flex-wrap items-end gap-2 p-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-wider text-[color:var(--cofex-black)]/55 uppercase">{t("walletPage.from")}</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36 rounded-full text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold tracking-wider text-[color:var(--cofex-black)]/55 uppercase">{t("walletPage.to")}</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36 rounded-full text-xs" />
            </div>
            {(from || to) && (
              <Button onClick={() => { setFrom(""); setTo(""); }} variant="ghost" size="sm" className="h-8 rounded-full text-xs">
                {t("walletPage.clear")}
              </Button>
            )}
            <div className="ml-auto flex gap-3 text-[11px]">
              <span className="font-semibold text-emerald-700">+{t("walletPage.earned", { count: totals.earned.toLocaleString() })}</span>
              <span className="font-semibold text-rose-700">−{t("walletPage.spent", { count: totals.spent.toLocaleString() })}</span>
            </div>
          </div>
          <QueryBoundary
            query={ledgerQuery}
            loadingLabel={t("walletPage.loadingActivity")}
            isEmpty={(data) => data.length === 0}
            emptyTitle={t("walletPage.noActivity")}
            emptyDescription={t("walletPage.noActivityHint")}
            emptyActionLabel={t("walletPage.emptyExploreCafes")}
            emptyActionTo="/explore"
          >
            {(entries) => (
              <div className="cofex-app-card divide-y overflow-hidden">
                {entries.map((l) => {
                  const meta = sourceMeta[l.source] ?? {
                    label: l.source,
                    Icon: Sparkles,
                    color: "text-[color:var(--cofex-black)]/70 bg-[color:var(--cofex-cream)]",
                  };
                  const pos = l.delta > 0;
                  const exp = l.expires_at ? new Date(l.expires_at) : null;
                  const expiresSoon = exp && exp.getTime() - Date.now() < 30 * 86400000 && exp.getTime() > Date.now();
                  const Icon = meta.Icon;
                  return (
                    <div key={l.id} className="flex items-center gap-3 p-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[color:var(--cofex-coffee-deep)]">{meta.label}</div>
                        <div className="text-[11px] text-[color:var(--cofex-black)]/55">
                          {new Date(l.created_at).toLocaleString()}
                          {exp && (
                            <>
                              {" · "}
                              {t("walletPage.expiresOn", { date: exp.toLocaleDateString() })}
                              {expiresSoon && <span className="font-semibold text-amber-700"> {t("walletPage.expiresSoon")}</span>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-0.5 text-sm font-bold ${pos ? "text-emerald-700" : "text-rose-700"}`}>
                        {pos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                        {pos ? "+" : ""}
                        {l.delta} {t("walletPage.pts")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </QueryBoundary>
        </AppPageSection>

        <AppPageSection title={t("rewardGift.historyTitle")} icon={<Gift className="h-5 w-5 text-rose-500" />}>
          <GiftHistorySection />
        </AppPageSection>
      </AppPageBody>
    </AppPage>
  );
}

function Earn({
  Icon,
  label,
  pts,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  pts: number | string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-2 backdrop-blur">
      <Icon className="mx-auto h-3.5 w-3.5 opacity-90" />
      <div className="mt-1 font-semibold">{typeof pts === "number" ? `+${pts}` : pts}</div>
      <div className="truncate text-[10px] opacity-70">{label}</div>
    </div>
  );
}