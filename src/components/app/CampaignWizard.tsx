import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { billingLimitsForShop, usePartnerBilling } from "@/lib/queries/billing";
import { EEFFOC_TEMPLATES, EEFFOC_TEMPLATE_CATEGORIES, EEFFOC_CATEGORY_GROUPS, EEFFOC_CATEGORY_LABEL_KEYS, type EeffocTemplate, type EeffocTemplateCategory } from "@/lib/eeffoc-templates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Megaphone,
  Gift,
  Clock,
  Hash,
  Sparkles,
  Eye,
  Rocket,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CampaignWizardPreview } from "@/components/app/CampaignWizardPreview";
import { PARTNER_CHIP, PARTNER_CHIP_ACTIVE } from "@/components/app/partner/PartnerShell";
import {
  WIZARD_REWARD_TYPES,
  WIZARD_SOCIAL_PLATFORM_ACTIONS,
  WIZARD_MANUAL_PROOF_ACTION,
  WIZARD_SMART_SUGGESTIONS,
  WIZARD_STEP_COUNT,
  applySuggestion,
  buildActiveHoursJson,
  buildRewardDescription,
  buildWizardSocialRequirements,
  defaultWizardForm,
  formatQuantityExample,
  isWizardSocialActionSelected,
  parseHashtagsInput,
  platformsToSocialActions,
  primaryHashtag,
  resolvePublishTiming,
  resolveTimingDates,
  socialActionsToFulfillment,
  toggleWizardSocialAction,
  type WizardFormState,
  type WizardPublishMode,
  type WizardTimingPreset,
} from "@/lib/campaign-wizard";
import { REWARD_MARKER_STYLES } from "@/lib/map/campaign-markers";
import { CofexIconTile } from "@/components/app/CofexIconTile";
import { resolveEeffocTemplateIcon, resolveWizardSuggestionIcon } from "@/lib/eeffoc-template-icons";
import { buildPartnerCampaignTermsTemplate } from "@/lib/campaign-compliance";
import { parseSocialRequirements, type CampaignFulfillmentMode } from "@/lib/campaign-fulfillment";
import type { CampaignRewardType } from "@/lib/domain/campaign-reward-model";

type Shop = { id: string; name: string; social_links?: Record<string, string> | null };

const textSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(600),
  hashtags: z.string().trim().min(3).max(200),
  cafe_handle: z.string().trim().max(40).optional(),
  terms: z.string().trim().max(800).optional(),
  requirements: z.string().trim().max(400).optional(),
});

export function CampaignWizard({
  open,
  onOpenChange,
  onCreated,
  editCampaign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
  editCampaign?: {
    id: string;
    title: string;
    description: string | null;
    reward_description: string | null;
    requirements: string | null;
    hashtag: string | null;
    points_reward: number;
    max_participants: number | null;
    fulfillment_mode: CampaignFulfillmentMode;
    auto_approve_social?: boolean;
    social_requirements?: unknown;
    starts_at: string | null;
    ends_at: string | null;
    participant_count?: number;
    coffee_shop_id?: string;
    reward_type?: string | null;
    reward_quantity?: number | null;
    daily_redemption_limit?: number | null;
    terms_and_conditions?: string | null;
    hashtags?: string[] | null;
    status?: string;
  } | null;
}) {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(0);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<EeffocTemplateCategory | "all">("all");
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [campaignType, setCampaignType] = useState("custom");
  const [form, setForm] = useState<WizardFormState>(defaultWizardForm());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);

  const shopName = shops.find((s) => s.id === shopId)?.name ?? "Your café";
  const shopLimits = useMemo(
    () => (shopId ? billingLimitsForShop(billing, shopId) : null),
    [billing, shopId],
  );
  const filteredTemplates = useMemo(
    () =>
      templateCategory === "all"
        ? EEFFOC_TEMPLATES
        : EEFFOC_TEMPLATES.filter((tpl) => tpl.category === templateCategory),
    [templateCategory],
  );
  const templateCategories = useMemo(
    () => EEFFOC_TEMPLATE_CATEGORIES.filter((cat) => EEFFOC_TEMPLATES.some((tpl) => tpl.category === cat)),
    [],
  );
  const templateCategoryGroups = useMemo(
    () =>
      EEFFOC_CATEGORY_GROUPS.map((group) => ({
        ...group,
        categories: group.categories.filter((cat) => templateCategories.includes(cat)),
      })).filter((group) => group.categories.length > 0),
    [templateCategories],
  );
  const quantityExample = formatQuantityExample(form.reward_type, form.reward_quantity);
  const timingPreview = resolveTimingDates(form.timing_preset, form.custom_start, form.custom_end);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from("coffee_shops")
        .select("id, name, social_links")
        .eq("partner_id", authUser.id);
      const list = (data ?? []) as Shop[];
      setShops(list);
      const preferredShopId = editCampaign?.coffee_shop_id ?? list[0]?.id;
      if (preferredShopId) {
        setShopId(preferredShopId);
        const shop = list.find((s) => s.id === preferredShopId) ?? list[0];
        const ig = shop?.social_links?.instagram ?? "";
        const handle = ig.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/$/, "");
        if (handle && !editCampaign) {
          setForm((f) => ({ ...f, cafe_handle: handle.startsWith("@") ? handle.slice(1) : handle }));
        }
      }
    })();
  }, [open, editCampaign?.id, editCampaign?.coffee_shop_id]);

  useEffect(() => {
    if (!open || editCampaign) return;
    const template = buildPartnerCampaignTermsTemplate(i18n.language);
    setForm((f) => (f.terms.trim() ? f : { ...f, terms: template }));
  }, [open, editCampaign, i18n.language]);

  useEffect(() => {
    if (!open || !editCampaign) return;
    const start = editCampaign.starts_at ? new Date(editCampaign.starts_at) : new Date();
    const end = editCampaign.ends_at ? new Date(editCampaign.ends_at) : new Date();
    setStep(1);
    setCampaignType("custom");
    setForm({
      ...defaultWizardForm(),
      title: editCampaign.title,
      description: editCampaign.description ?? "",
      requirements: editCampaign.requirements ?? "",
      hashtags: (editCampaign.hashtags?.length ? editCampaign.hashtags.join(", ") : editCampaign.hashtag) ?? "#WeGiveEEFFOC",
      points_reward: editCampaign.points_reward,
      max_participants: editCampaign.max_participants ?? 50,
      reward_type: (editCampaign.reward_type as CampaignRewardType) ?? "coffee",
      reward_quantity: editCampaign.reward_quantity ?? 1,
      daily_redemption_limit: editCampaign.daily_redemption_limit ?? null,
      terms: editCampaign.terms_and_conditions?.trim()
        ? editCampaign.terms_and_conditions
        : buildPartnerCampaignTermsTemplate(i18n.language),
      auto_approve_social: editCampaign.auto_approve_social ?? false,
      timing_preset: "custom",
      custom_start: start.toISOString().slice(0, 10),
      custom_end: end.toISOString().slice(0, 10),
      social_actions: platformsToSocialActions(
        parseSocialRequirements(editCampaign.social_requirements).platforms,
      ),
      publish_mode: editCampaign.status === "draft" ? "draft" : "active",
    });
    setErrors({});
    if (editCampaign.coffee_shop_id) setShopId(editCampaign.coffee_shop_id);
  }, [open, editCampaign, i18n.language]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setShowTemplates(false);
      setErrors({});
      setCampaignType("custom");
      setForm(defaultWizardForm());
    }
  }, [open]);

  function pickSuggestion(id: string) {
    const suggestion = WIZARD_SMART_SUGGESTIONS.find((s) => s.id === id);
    if (!suggestion) return;
    setForm((f) => applySuggestion(f, suggestion.patch));
    setCampaignType(suggestion.id);
    setStep(1);
  }

  function pickTemplate(tpl: EeffocTemplate) {
    setCampaignType(tpl.id);
    const social = tpl.social_requirements?.platforms;
    setForm((f) =>
      applySuggestion(f, {
        title: tpl.title === "Custom EEFFOC" ? "" : tpl.title,
        description: tpl.description,
        requirements: tpl.requirements,
        hashtags: tpl.hashtag,
        points_reward: tpl.points_reward,
        max_participants: tpl.max_participants ?? 100,
        social_actions: platformsToSocialActions(social),
        auto_approve_social: f.auto_approve_social,
        reward_type: inferRewardFromDescription(tpl.reward_description),
        reward_quantity: 1,
        timing_preset: "this_week",
      }),
    );
    setShowTemplates(false);
    setStep(1);
  }

  function validateStep(current: number): boolean {
    const errs: Record<string, string> = {};
    if (current === 2) {
      if (form.reward_quantity < 1 || form.reward_quantity > 100) errs.reward_quantity = t("campaignWizard.errors.quantity");
      if (form.max_participants < 1 || form.max_participants > 10000) errs.max_participants = t("campaignWizard.errors.totalLimit");
      if (form.daily_redemption_limit != null && form.daily_redemption_limit > form.max_participants) {
        errs.daily_redemption_limit = t("campaignWizard.errors.dailyLimit");
      }
    }
    if (current === 4 && form.social_actions.length === 0) {
      errs.social_actions = t("campaignWizard.errors.pickSocial");
    }
    if (current === 3 && form.timing_preset === "custom") {
      if (!form.custom_start) errs.custom_start = t("campaignWizard.errors.startDate");
      if (!form.custom_end) errs.custom_end = t("campaignWizard.errors.endDate");
    }
    if (current === 5) {
      const parsed = textSchema.safeParse(form);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
      }
    }
    if (current === 7 && form.publish_mode === "scheduled" && !form.scheduled_start) {
      errs.scheduled_start = t("campaignWizard.errors.scheduledStart");
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error(t("campaignWizard.errors.fixFields"));
      return false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep(5) || !validateStep(7)) return;
    if (!shopId) {
      toast.error(t("campaignWizard.errors.pickShop"));
      return;
    }
    const publish = resolvePublishTiming(form);
    if (!editCampaign && publish.status === "active" && shopLimits && !shopLimits.canAddCampaign) {
      toast.error(t("partnerCampaignsPage.limitReached"));
      return;
    }

    setSaving(true);
    const hashtags = parseHashtagsInput(form.hashtags);
    const hashtag = primaryHashtag(hashtags);
    const fulfillment_mode = socialActionsToFulfillment(form.social_actions);
    const social_requirements = buildWizardSocialRequirements(form.social_actions, form.cafe_handle, form.title);
    const reward_description = buildRewardDescription(form.reward_type, form.reward_quantity);
    const active_hours = buildActiveHoursJson(form);

    if (editCampaign) {
      const { error } = await supabase.rpc("partner_update_campaign", {
        _campaign_id: editCampaign.id,
        _patch: {
          title: form.title,
          description: form.description,
          reward_description,
          requirements: form.requirements || null,
          hashtag,
          hashtags,
          points_reward: form.points_reward,
          max_participants: form.max_participants,
          available_quantity: form.max_participants,
          reward_type: form.reward_type,
          reward_quantity: form.reward_quantity,
          daily_redemption_limit: form.daily_redemption_limit,
          active_hours,
          terms_and_conditions: form.terms || null,
          ends_at: publish.endsAt.toISOString(),
          starts_at: publish.startsAt.toISOString(),
          auto_approve_social: form.auto_approve_social,
          status: publish.status,
          ...(editCampaign.participant_count === 0 ? { fulfillment_mode, social_requirements } : {}),
        },
      });
      setSaving(false);
      if (error) {
        toast.error(error.message.replace(/^.*?: /, ""));
        return;
      }
      toast.success(t("campaignWizard.saved"));
      onOpenChange(false);
      onCreated?.();
      return;
    }

    const { error } = await supabase.from("campaigns").insert({
      coffee_shop_id: shopId,
      title: form.title,
      description: form.description,
      reward_description,
      requirements: form.requirements || null,
      hashtag,
      hashtags,
      points_reward: form.points_reward,
      max_participants: form.max_participants,
      available_quantity: form.max_participants,
      reward_type: form.reward_type,
      reward_quantity: form.reward_quantity,
      daily_redemption_limit: form.daily_redemption_limit,
      active_hours,
      terms_and_conditions: form.terms || null,
      campaign_type: campaignType,
      fulfillment_mode,
      social_requirements,
      auto_approve_social: form.auto_approve_social,
      status: publish.status,
      starts_at: publish.startsAt.toISOString(),
      ends_at: publish.endsAt.toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (publish.status === "draft") toast.success(t("campaignWizard.savedDraft"));
    else if (publish.isScheduled) toast.success(t("campaignWizard.savedScheduled"));
    else toast.success(t("campaignWizard.published"));
    onOpenChange(false);
    onCreated?.();
  }

  const stepTitle = editCampaign
    ? t("campaignWizard.editTitle")
    : step === 0
      ? t("campaignWizard.stepIdeas")
      : step === 1
        ? t("campaignWizard.stepReward")
        : step === 2
          ? t("campaignWizard.stepQuantity")
          : step === 3
            ? t("campaignWizard.stepTiming")
            : step === 4
              ? t("campaignWizard.stepSocial")
              : step === 5
                ? t("campaignWizard.stepText")
                : step === 6
                  ? t("campaignWizard.stepPreview")
                  : t("campaignWizard.stepPublish");

  const totalSteps = editCampaign ? 7 : WIZARD_STEP_COUNT;
  const displayStep = editCampaign ? step : step + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            {stepTitle} · {t("campaignWizard.stepOf", { current: displayStep, total: totalSteps })}
          </DialogTitle>
          <DialogDescription>{t("campaignWizard.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                editCampaign ? (i < step ? "bg-amber-600" : "bg-zinc-200") : i <= step ? "bg-amber-600" : "bg-zinc-200"
              }`}
            />
          ))}
        </div>

        {shops.length > 1 && step > 0 && (
          <div className="mb-4">
            <Label>{t("campaignWizard.coffeeShop")}</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {step === 0 && !editCampaign && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold">{t("campaignWizard.suggestionsHeading")}</h3>
            </div>
            <p className="text-sm text-zinc-500">{t("campaignWizard.suggestionsHint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {WIZARD_SMART_SUGGESTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSuggestion(s.id)}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-amber-500 hover:shadow-md"
                >
                  {(() => {
                    const icon = resolveWizardSuggestionIcon(s);
                    return "rewardType" in icon ? (
                      <CofexIconTile rewardType={icon.rewardType} size="md" />
                    ) : (
                      <CofexIconTile meta={icon.meta} size="md" />
                    );
                  })()}
                  <div className="mt-1 font-semibold">{t(s.titleKey)}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{t(s.descriptionKey)}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-[color:var(--cofex-cream)] p-4 shadow-sm">
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-800/80">
                  {t("campaignWizard.templatesEyebrow")}
                </p>
                <Button
                  type="button"
                  onClick={() => setShowTemplates((v) => !v)}
                  className={`cofex-onboarding-cta mt-3 h-12 w-full rounded-full border-0 text-base font-bold text-white shadow-md ${
                    showTemplates ? "ring-2 ring-amber-300 ring-offset-2" : ""
                  }`}
                >
                  <Sparkles className="mr-2 h-5 w-5 shrink-0" />
                  {showTemplates ? t("campaignWizard.hideTemplates") : t("campaignWizard.browseTemplates")}
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
                </Button>
                <p className="mt-2 text-center text-xs text-[color:var(--cofex-black)]/55">
                  {t("campaignWizard.templatesCtaHint")}
                </p>
              </div>
              <div className="flex justify-center">
                <Button type="button" variant="ghost" size="sm" className="text-[color:var(--cofex-black)]/55" onClick={() => setStep(1)}>
                  {t("campaignWizard.startScratch")}
                </Button>
              </div>
            </div>
            {showTemplates && (
              <div className="mt-4 space-y-3 border-t border-[color:var(--border)] pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-black)]/45">
                    {t("campaignWizard.filterTemplates")}
                  </p>
                  <div className="mt-2 space-y-3">
                    <button
                      type="button"
                      onClick={() => setTemplateCategory("all")}
                      className={`w-full ${templateCategory === "all" ? PARTNER_CHIP_ACTIVE : PARTNER_CHIP}`}
                    >
                      {t("partnerCampaignsPage.allTemplates")}
                    </button>
                    {templateCategoryGroups.map((group) => (
                      <div key={group.id}>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--cofex-black)]/40">
                          {t(group.labelKey)}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {group.categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setTemplateCategory(cat)}
                              className={`min-h-9 px-2 py-1.5 text-center text-xs leading-tight ${
                                templateCategory === cat ? PARTNER_CHIP_ACTIVE : PARTNER_CHIP
                              }`}
                            >
                              {t(EEFFOC_CATEGORY_LABEL_KEYS[cat])}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-[color:var(--cofex-black)]/50">
                  {t("campaignWizard.templatesShowing", { count: filteredTemplates.length })}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => pickTemplate(tpl)}
                      className="rounded-xl border p-3 text-left text-sm hover:border-amber-400"
                    >
                      {(() => {
                        const icon = resolveEeffocTemplateIcon(tpl);
                        return (
                          <span className="inline-flex items-center gap-2">
                            {"rewardType" in icon ? (
                              <CofexIconTile rewardType={icon.rewardType} size="xs" />
                            ) : (
                              <CofexIconTile meta={icon.meta} size="xs" />
                            )}
                            {tpl.title}
                          </span>
                        );
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Gift className="h-4 w-4" /> {t("campaignWizard.stepReward")}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {WIZARD_REWARD_TYPES.map((type) => {
                const style = REWARD_MARKER_STYLES[type];
                const selected = form.reward_type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, reward_type: type })}
                    className={`rounded-2xl border p-4 text-center transition ${
                      selected ? "border-amber-600 bg-amber-50 ring-2 ring-amber-200" : "border-zinc-200 hover:border-amber-300"
                    }`}
                  >
                    <CofexIconTile rewardType={type} size="md" className="mx-auto" />
                    <div className="mt-1 text-sm font-semibold">{t(`campaignMap.rewardTypes.${type}`)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">{t("campaignWizard.stepQuantity")}</h3>
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
              {t("campaignWizard.quantityExample", { example: quantityExample })}
            </div>
            <Field label={t("campaignWizard.perExplorer")} error={errors.reward_quantity}>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.reward_quantity}
                onChange={(e) => setForm({ ...form, reward_quantity: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("campaignWizard.totalLimit")} error={errors.max_participants}>
              <Input
                type="number"
                min={1}
                max={10000}
                value={form.max_participants}
                onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("campaignWizard.dailyLimit")} error={errors.daily_redemption_limit}>
              <Input
                type="number"
                min={0}
                placeholder={t("campaignWizard.dailyLimitPlaceholder")}
                value={form.daily_redemption_limit ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    daily_redemption_limit: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </Field>
            <Field label={t("campaignWizard.bonusPoints")}>
              <Input
                type="number"
                min={0}
                max={500}
                value={form.points_reward}
                onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" /> {t("campaignWizard.stepTiming")}
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["today_only", "this_week", "custom"] as WizardTimingPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, timing_preset: preset })}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    form.timing_preset === preset ? "border-amber-600 bg-amber-50" : "border-zinc-200"
                  }`}
                >
                  <div className="font-semibold">{t(`campaignWizard.timing.${preset}`)}</div>
                </button>
              ))}
            </div>
            {form.timing_preset === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("campaignWizard.startDate")} error={errors.custom_start}>
                  <Input
                    type="date"
                    value={form.custom_start}
                    onChange={(e) => setForm({ ...form, custom_start: e.target.value })}
                  />
                </Field>
                <Field label={t("campaignWizard.endDate")} error={errors.custom_end}>
                  <Input
                    type="date"
                    value={form.custom_end}
                    onChange={(e) => setForm({ ...form, custom_end: e.target.value })}
                  />
                </Field>
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-sm font-semibold">{t("campaignWizard.specificHours")}</div>
                <p className="text-xs text-zinc-600">{t("campaignWizard.specificHoursHint")}</p>
              </div>
              <Switch
                checked={form.use_active_hours}
                onCheckedChange={(v) => setForm({ ...form, use_active_hours: v })}
              />
            </div>
            {form.use_active_hours && (
              <div className="grid grid-cols-2 gap-4">
                <Field label={t("campaignWizard.hoursFrom")}>
                  <Input
                    type="time"
                    value={form.active_hours_start}
                    onChange={(e) => setForm({ ...form, active_hours_start: e.target.value })}
                  />
                </Field>
                <Field label={t("campaignWizard.hoursTo")}>
                  <Input
                    type="time"
                    value={form.active_hours_end}
                    onChange={(e) => setForm({ ...form, active_hours_end: e.target.value })}
                  />
                </Field>
              </div>
            )}
            <p className="text-xs text-zinc-500">
              {t("campaignWizard.timingSummary", {
                start: timingPreview.start.toLocaleDateString(),
                end: timingPreview.end.toLocaleDateString(),
              })}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-semibold">{t("campaignWizard.stepSocial")}</h3>
            <p className="text-xs text-zinc-500">{t("campaignWizard.socialMultiHint")}</p>
            {errors.social_actions && <p className="text-xs text-red-600">{errors.social_actions}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {WIZARD_SOCIAL_PLATFORM_ACTIONS.map((action) => {
                const selected = isWizardSocialActionSelected(form.social_actions, action);
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      setForm({ ...form, social_actions: toggleWizardSocialAction(form.social_actions, action) })
                    }
                    className={`rounded-xl border p-3 text-left text-sm transition ${
                      selected ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600/30" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{t(`campaignWizard.social.${action}`)}</div>
                      {selected && <Check className="h-4 w-4 shrink-0 text-amber-700" />}
                    </div>
                    <p className="mt-1 text-xs text-zinc-600">{t(`campaignWizard.social.${action}Hint`)}</p>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  social_actions: toggleWizardSocialAction(form.social_actions, WIZARD_MANUAL_PROOF_ACTION),
                })
              }
              className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                isWizardSocialActionSelected(form.social_actions, WIZARD_MANUAL_PROOF_ACTION)
                  ? "border-amber-600 bg-amber-50 ring-1 ring-amber-600/30"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{t("campaignWizard.social.manual_proof")}</div>
                {isWizardSocialActionSelected(form.social_actions, WIZARD_MANUAL_PROOF_ACTION) && (
                  <Check className="h-4 w-4 shrink-0 text-amber-700" />
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-600">{t("campaignWizard.social.manual_proofHint")}</p>
            </button>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <div className="text-sm font-semibold">{t("campaignWizard.autoApprove")}</div>
                <p className="text-xs text-zinc-600">{t("campaignWizard.autoApproveHint")}</p>
              </div>
              <Switch
                checked={form.auto_approve_social}
                onCheckedChange={(v) => setForm({ ...form, auto_approve_social: v })}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Hash className="h-4 w-4" /> {t("campaignWizard.stepText")}
            </h3>
            <Field label={t("campaignWizard.campaignTitle")} error={errors.title}>
              <Input maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label={t("campaignWizard.description")} error={errors.description}>
              <Textarea
                rows={3}
                maxLength={600}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <Field label={t("campaignWizard.hashtags")} error={errors.hashtags}>
              <Input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} />
            </Field>
            <Field label={t("campaignWizard.cafeHandle")} error={errors.cafe_handle}>
              <Input
                placeholder="@yourcafe"
                value={form.cafe_handle}
                onChange={(e) => setForm({ ...form, cafe_handle: e.target.value.replace(/^@/, "") })}
              />
            </Field>
            <Field label={t("campaignWizard.requirements")}>
              <Textarea
                rows={2}
                maxLength={400}
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              />
            </Field>
            <Field label={t("campaignWizard.terms")}>
              <Textarea
                rows={5}
                maxLength={800}
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
              />
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">{t("campaignWizard.termsHint")}</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/90">{t("campaignWizard.termsResponsibility")}</p>
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Eye className="h-4 w-4" /> {t("campaignWizard.stepPreview")}
            </h3>
            <CampaignWizardPreview form={form} shopName={shopName} />
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold">
              <Rocket className="h-4 w-4" /> {t("campaignWizard.stepPublish")}
            </h3>
            {shopLimits && !shopLimits.canAddCampaign && form.publish_mode !== "draft" && !editCampaign && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("partnerCampaignsPage.limitReached")}{" "}
                <Link to="/partner/billing" className="font-medium underline">
                  {t("partnerCampaignsPage.upgradeBilling")}
                </Link>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["draft", "active", "scheduled"] as WizardPublishMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm({ ...form, publish_mode: mode })}
                  className={`flex min-h-[5.5rem] flex-col rounded-2xl border p-4 text-left transition ${
                    form.publish_mode === mode
                      ? "border-amber-600 bg-amber-50 ring-2 ring-amber-200 ring-offset-1"
                      : "border-zinc-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="font-semibold leading-snug text-[color:var(--cofex-coffee-deep)]">
                    {t(`campaignWizard.publishModes.${mode}`)}
                  </div>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-[color:var(--cofex-black)]/60">
                    {t(`campaignWizard.publishModes.${mode}Hint`)}
                  </p>
                </button>
              ))}
            </div>
            {form.publish_mode === "scheduled" && (
              <Field label={t("campaignWizard.scheduledStart")} error={errors.scheduled_start}>
                <Input
                  type="datetime-local"
                  value={form.scheduled_start}
                  onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                />
              </Field>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            disabled={(editCampaign ? step <= 1 : step === 0) || saving}
            onClick={() => {
              setErrors({});
              setStep((s) => Math.max(editCampaign ? 1 : 0, s - 1));
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> {t("campaignWizard.back")}
          </Button>
          {step < 7 ? (
            <Button
              onClick={() => {
                if (step > 0 && !validateStep(step)) return;
                setStep((s) => Math.min(7, s + 1));
              }}
              disabled={step === 0 && !editCampaign}
            >
              {t("campaignWizard.next")} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={
                saving ||
                (!editCampaign &&
                  form.publish_mode !== "draft" &&
                  shopLimits !== null &&
                  !shopLimits.canAddCampaign)
              }
              className="bg-amber-700 hover:bg-amber-800"
            >
              {saving ? (
                t("campaignWizard.saving")
              ) : (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  {form.publish_mode === "draft"
                    ? t("campaignWizard.saveDraft")
                    : form.publish_mode === "scheduled"
                      ? t("campaignWizard.schedule")
                      : editCampaign
                        ? t("campaignWizard.save")
                        : t("campaignWizard.publish")}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inferRewardFromDescription(desc: string): CampaignRewardType {
  const d = desc.toLowerCase();
  if (d.includes("matcha")) return "matcha";
  if (d.includes("espresso")) return "espresso";
  if (d.includes("cappuccino")) return "cappuccino";
  if (d.includes("ice cream")) return "ice_cream";
  if (d.includes("juice")) return "juice";
  if (d.includes("cola")) return "cola";
  return "coffee";
}
