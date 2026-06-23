import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling, billingLimitsForShop } from "@/lib/queries/billing";
import { useSetCampaignStatus, useDuplicatePartnerCampaign } from "@/lib/queries/partner";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { CampaignWizard } from "@/components/app/CampaignWizard";
import { CampaignParticipationQr } from "@/components/app/CampaignParticipationQr";
import { FULFILLMENT_MODE_LABELS, type CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Plus,
  Users,
  Gift,
  Calendar,
  Hash,
  Trash2,
  Share2,
  Sparkles,
  Shield,
  Pencil,
  Pause,
  Play,
  Square,
  Copy,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { PARTNER_BTN, PartnerEmptyState, PartnerStatusPill } from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns · Partner" }] }),
  component: PartnerCampaignsPage,
});

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  reward_description: string | null;
  requirements: string | null;
  hashtag: string | null;
  hashtags?: string[] | null;
  points_reward: number;
  max_participants: number | null;
  available_quantity?: number | null;
  reward_type?: string | null;
  reward_quantity?: number | null;
  daily_redemption_limit?: number | null;
  terms_and_conditions?: string | null;
  campaign_type: string;
  fulfillment_mode?: CampaignFulfillmentMode;
  social_requirements?: unknown;
  participation_token?: string | null;
  auto_approve_social?: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  coffee_shop_id: string;
  participant_count?: number;
};

function campaignDisplayStatus(c: Campaign): "active" | "paused" | "ended" | "draft" | "scheduled" {
  if (c.status === "draft") return "draft";
  if (c.status === "paused") return "paused";
  if (c.status === "ended") return "ended";
  if (c.ends_at && new Date(c.ends_at) <= new Date()) return "ended";
  if (c.status === "active" && c.starts_at && new Date(c.starts_at) > new Date()) return "scheduled";
  if (c.status === "active") return "active";
  return "ended";
}

function PartnerCampaignsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);
  const statusMutation = useSetCampaignStatus();
  const duplicateMutation = useDuplicatePartnerCampaign();
  const primaryShopId = billing?.shops[0]?.coffee_shop_id;
  const atCampaignLimit =
    primaryShopId !== undefined &&
    billing !== undefined &&
    !billingLimitsForShop(billing, primaryShopId).canAddCampaign;

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [items, setItems] = useState<Campaign[]>([]);
  const [shopNames, setShopNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [qrCampaignId, setQrCampaignId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setLoading(false);
      return;
    }
    const { data: shops } = await supabase.from("coffee_shops").select("id, name").eq("partner_id", authUser.id);
    const names: Record<string, string> = {};
    for (const s of shops ?? []) names[s.id] = s.name;
    setShopNames(names);
    const ids = (shops ?? []).map((s) => s.id);
    if (ids.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .in("coffee_shop_id", ids)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Campaign[];
    if (rows.length) {
      const { data: counts } = await supabase
        .from("campaign_participants")
        .select("campaign_id")
        .in("campaign_id", rows.map((r) => r.id));
      const map = new Map<string, number>();
      for (const r of counts ?? []) {
        if (!r.campaign_id) continue;
        map.set(r.campaign_id, (map.get(r.campaign_id) ?? 0) + 1);
      }
      rows.forEach((r) => (r.participant_count = map.get(r.id) ?? 0));
    }
    setItems(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function duplicate(c: Campaign) {
    try {
      const res = await duplicateMutation.mutateAsync(c.id);
      toast.success(t("partnerCampaignsPage.duplicated", { title: res.title }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : t("partnerCampaignsPage.duplicateFailed"));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("partnerCampaignsPage.deleteConfirm"))) return;
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("partnerCampaignsPage.deleted"));
      load();
    }
  }

  async function setStatus(campaignId: string, status: "active" | "paused" | "ended") {
    try {
      await statusMutation.mutateAsync({ campaignId, status });
      toast.success(
        status === "ended"
          ? t("partnerCampaignsPage.ended")
          : status === "paused"
            ? t("partnerCampaignsPage.paused")
            : t("partnerCampaignsPage.resumed"),
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message.replace(/^.*?: /, "") : "Could not update status");
    }
  }

  function openEdit(c: Campaign) {
    setEditTarget(c);
    setOpen(true);
  }

  function closeWizard(next: boolean) {
    setOpen(next);
    if (!next) setEditTarget(null);
  }

  const editCampaign = useMemo(() => {
    if (!editTarget) return null;
    return {
      id: editTarget.id,
      title: editTarget.title,
      description: editTarget.description,
      reward_description: editTarget.reward_description,
      requirements: editTarget.requirements,
      hashtag: editTarget.hashtag,
      hashtags: editTarget.hashtags,
      points_reward: editTarget.points_reward,
      max_participants: editTarget.max_participants,
      reward_type: editTarget.reward_type,
      reward_quantity: editTarget.reward_quantity,
      daily_redemption_limit: editTarget.daily_redemption_limit,
      terms_and_conditions: editTarget.terms_and_conditions,
      fulfillment_mode: editTarget.fulfillment_mode ?? "check_in",
      social_requirements: editTarget.social_requirements,
      auto_approve_social: editTarget.auto_approve_social,
      starts_at: editTarget.starts_at,
      ends_at: editTarget.ends_at,
      participant_count: editTarget.participant_count,
      coffee_shop_id: editTarget.coffee_shop_id,
      status: editTarget.status,
    };
  }, [editTarget]);

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.partnerCampaigns.eyebrow")}
        title={t("pages.partnerCampaigns.title")}
        subtitle={t("pages.partnerCampaigns.subtitle")}
        action={
          <Button
            onClick={() => {
              setEditTarget(null);
              setOpen(true);
            }}
            disabled={atCampaignLimit}
            className={PARTNER_BTN}
          >
            <Plus className="mr-1 h-4 w-4" /> {t("partnerCampaignsPage.newCampaign")}
          </Button>
        }
      />
      <AppPageBody className="pb-10">
        {atCampaignLimit && (
          <div className="cofex-app-card mb-6 border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 shadow-none">
            {t("partnerCampaignsPage.limitReached")}{" "}
            <Link to="/partner/billing" className="font-semibold underline">
              {t("partnerCampaignsPage.upgradeBilling")}
            </Link>{" "}
            {t("partnerCampaignsPage.limitReachedSuffix")}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cofex-app-card h-44 animate-pulse bg-[color:var(--cofex-cream)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <PartnerEmptyState
            Icon={Megaphone}
            title={t("partnerCampaignsPage.emptyTitle")}
            description={t("partnerCampaignsPage.emptyDescription")}
            action={
              <Button className={`mt-4 ${PARTNER_BTN}`} onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> {t("partnerCampaignsPage.createFirst")}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((c) => {
              const display = campaignDisplayStatus(c);
              const cap = c.available_quantity ?? c.max_participants;
              const remaining = cap != null ? Math.max(0, cap - (c.participant_count ?? 0)) : null;
              const statusTone =
                display === "active"
                  ? "success"
                  : display === "paused"
                    ? "warn"
                    : display === "scheduled"
                      ? "info"
                      : "neutral";
              return (
                <div key={c.id} className="cofex-app-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <PartnerStatusPill tone={statusTone}>
                          {display === "active"
                            ? t("partnerCampaignsPage.statusActive")
                            : display === "paused"
                              ? t("partnerCampaignsPage.statusPaused")
                              : display === "draft"
                                ? t("partnerCampaignsPage.statusDraft")
                                : display === "scheduled"
                                  ? t("partnerCampaignsPage.statusScheduled")
                                  : t("partnerCampaignsPage.statusEnded")}
                        </PartnerStatusPill>
                        {remaining === 0 && display === "active" && (
                          <PartnerStatusPill tone="danger">{t("partnerCampaignsPage.statusFull")}</PartnerStatusPill>
                        )}
                        {c.auto_approve_social && (
                          <PartnerStatusPill tone="info">{t("partnerCampaignsPage.autoApprove")}</PartnerStatusPill>
                        )}
                      </div>
                      <h3 className="mt-2 text-lg font-extrabold text-[color:var(--cofex-coffee-deep)]">{c.title}</h3>
                      <p className="line-clamp-2 text-sm text-[color:var(--cofex-black)]/65">{c.description}</p>
                      {shopNames[c.coffee_shop_id] && (
                        <p className="mt-1 text-xs text-[color:var(--cofex-black)]/45">{shopNames[c.coffee_shop_id]}</p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(c.id)}
                      className="shrink-0 text-[color:var(--cofex-black)]/30 hover:text-rose-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <Meta Icon={Gift} label={c.reward_description ?? "-"} />
                    <Meta Icon={Hash} label={c.hashtag ?? "-"} />
                    <Meta
                      Icon={Users}
                      label={t("partnerCampaignsPage.joined", {
                        count: c.participant_count ?? 0,
                        max: c.max_participants ?? "∞",
                      })}
                    />
                    <Meta
                      Icon={Sparkles}
                      label={
                        remaining != null
                          ? t("partnerCampaignsPage.rewardsLeft", { count: remaining })
                          : t("partnerCampaignsPage.unlimitedRewards")
                      }
                    />
                    <Meta
                      Icon={Calendar}
                      label={
                        c.ends_at
                          ? t("partnerCampaignsPage.endsOn", { date: new Date(c.ends_at).toLocaleDateString() })
                          : t("partnerCampaignsPage.noEndDate")
                      }
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PartnerStatusPill tone="info">
                      {FULFILLMENT_MODE_LABELS[c.fulfillment_mode ?? "check_in"]}
                    </PartnerStatusPill>
                    {(c.fulfillment_mode === "social_proof" || c.fulfillment_mode === "hybrid") && (
                      <Link
                        to="/partner/submissions"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline"
                      >
                        <Share2 className="h-3 w-3" /> Review posts
                      </Link>
                    )}
                    {display === "active" && (
                      <button
                        type="button"
                        onClick={() => setQrCampaignId(qrCampaignId === c.id ? null : c.id)}
                        className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)] underline"
                      >
                        {qrCampaignId === c.id ? t("partnerCampaignsPage.hideQr") : t("partnerCampaignsPage.showQr")}
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[color:var(--border)] pt-3">
                    <Button type="button" size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => openEdit(c)}>
                      <Pencil className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.edit")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full text-xs"
                      disabled={duplicateMutation.isPending}
                      onClick={() => duplicate(c)}
                    >
                      <Copy className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.duplicate")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full text-xs"
                      onClick={() => setQrCampaignId(c.id)}
                    >
                      <QrCode className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.qrTools")}
                    </Button>
                    {display === "active" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs"
                        disabled={statusMutation.isPending}
                        onClick={() => setStatus(c.id, "paused")}
                      >
                        <Pause className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.pause")}
                      </Button>
                    )}
                    {display === "paused" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs"
                        disabled={statusMutation.isPending}
                        onClick={() => setStatus(c.id, "active")}
                      >
                        <Play className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.resume")}
                      </Button>
                    )}
                    {(display === "active" || display === "paused") && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full text-xs text-rose-700 hover:text-rose-800"
                        disabled={statusMutation.isPending}
                        onClick={() => {
                          if (confirm(t("partnerCampaignsPage.endConfirm"))) setStatus(c.id, "ended");
                        }}
                      >
                        <Square className="mr-1 h-3 w-3" /> {t("partnerCampaignsPage.end")}
                      </Button>
                    )}
                  </div>

                  {qrCampaignId === c.id && (
                    <div className="mt-4">
                      <CampaignParticipationQr
                        campaignId={c.id}
                        campaignTitle={c.title}
                        participationToken={c.participation_token}
                        shopName={shopNames[c.coffee_shop_id]}
                      />
                    </div>
                  )}
                  {display === "active" && (
                    <div className="mt-3 border-t border-[color:var(--border)] pt-3">
                      <Link
                        to="/partner/verify"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-black)]/55 hover:text-[color:var(--cofex-coffee-deep)]"
                      >
                        <Shield className="h-3 w-3" /> Verify redemption codes at counter
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <CampaignWizard open={open} onOpenChange={closeWizard} onCreated={load} editCampaign={editCampaign} />
      </AppPageBody>
    </AppPage>
  );
}

function Meta({ Icon, label }: { Icon: typeof Gift; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[color:var(--cofex-black)]/75">
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
      <span className="truncate">{label}</span>
    </div>
  );
}
