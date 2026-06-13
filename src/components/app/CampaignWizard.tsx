import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/use-user";
import { billingLimitsForShop, usePartnerBilling } from "@/lib/queries/billing";
import { EEFFOC_TEMPLATES, type EeffocTemplate } from "@/lib/eeffoc-templates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check, Megaphone, Calendar, Gift, ListChecks } from "lucide-react";
import { toast } from "sonner";

type Shop = { id: string; name: string };

const campaignSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(80, "Max 80 characters"),
  description: z.string().trim().min(10, "Tell explorers what this is about (10+ characters)").max(600, "Max 600 characters"),
  reward_description: z.string().trim().min(3, "Describe the reward (e.g. ‘Free espresso’)").max(200, "Max 200 characters"),
  requirements: z.string().trim().max(400, "Max 400 characters").optional().or(z.literal("")),
  hashtag: z.string().trim().regex(/^#?[A-Za-z0-9_]{2,40}$/, "Letters/numbers only, 2–40 chars, no spaces").max(40),
  points_reward: z.number().int("Whole number").min(0, "Cannot be negative").max(500, "Cap is 500 points"),
  durationDays: z.number().int("Whole number").min(1, "At least 1 day").max(120, "Max 120 days"),
  max_participants: z.number().int("Whole number").min(1, "At least 1 participant").max(10000, "Cap is 10,000"),
});

const stepFields: Record<number, (keyof z.infer<typeof campaignSchema>)[]> = {
  1: ["title", "description", "hashtag"],
  2: ["reward_description", "requirements", "points_reward", "durationDays", "max_participants"],
};

export function CampaignWizard({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [template, setTemplate] = useState<EeffocTemplate | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    reward_description: "",
    requirements: "",
    hashtag: "#WeGiveEEFFOC",
    points_reward: 10,
    durationDays: 14,
    max_participants: 100,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useUser();
  const { data: billing } = usePartnerBilling(user?.id);
  const shopLimits = useMemo(
    () => (shopId ? billingLimitsForShop(billing, shopId) : null),
    [billing, shopId],
  );

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("coffee_shops")
        .select("id, name")
        .eq("partner_id", user.id);
      setShops(data ?? []);
      if (data?.[0]) setShopId(data[0].id);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep(0); setTemplate(null); setErrors({});
      setForm({
        title: "", description: "", reward_description: "", requirements: "",
        hashtag: "#WeGiveEEFFOC", points_reward: 10, durationDays: 14, max_participants: 100,
      });
    }
  }, [open]);

  function pickTemplate(t: EeffocTemplate) {
    setTemplate(t);
    setForm({
      title: t.title === "Custom Campaign" ? "" : t.title,
      description: t.description,
      reward_description: t.reward_description,
      requirements: t.requirements,
      hashtag: t.hashtag,
      points_reward: t.points_reward,
      durationDays: t.durationDays,
      max_participants: t.max_participants ?? 100,
    });
    setStep(1);
  }

  const previewDates = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + form.durationDays);
    return { start, end };
  }, [form.durationDays]);

  async function submit() {
    const parsed = campaignSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
      setErrors(errs);
      setStep(1);
      return;
    }
    if (!shopId) { toast.error("Pick a coffee shop"); return; }
    if (shopLimits && !shopLimits.canAddCampaign) {
      toast.error("Active campaign limit reached for your plan. Upgrade at Billing.");
      return;
    }
    setSaving(true);
    const hashtag = form.hashtag.startsWith("#") ? form.hashtag : `#${form.hashtag}`;
    const { error } = await supabase.from("campaigns").insert({
      coffee_shop_id: shopId,
      title: form.title,
      description: form.description,
      reward_description: form.reward_description,
      requirements: form.requirements || null,
      hashtag,
      points_reward: form.points_reward,
      max_participants: form.max_participants,
      campaign_type: template?.id ?? "custom",
      status: "active",
      starts_at: previewDates.start.toISOString(),
      ends_at: previewDates.end.toISOString(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign published");
    onOpenChange(false);
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> EEFFOC Campaign — Step {step + 1} of 4
          </DialogTitle>
          <DialogDescription>We Give EEFFOC. (That's COFFEE backwards.)</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-amber-600" : "bg-zinc-200"}`} />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h3 className="font-semibold mb-3">Pick a template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EEFFOC_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t)}
                  className="text-left rounded-2xl border border-zinc-200 hover:border-amber-500 hover:shadow-md transition p-4 bg-white"
                >
                  <div className="text-3xl">{t.emoji}</div>
                  <div className="mt-2 font-semibold">{t.title}</div>
                  <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4" /> Details</h3>
            {shops.length > 1 && (
              <div>
                <Label>Coffee shop</Label>
                <Select value={shopId} onValueChange={setShopId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {shops.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Field label="Title" error={errors.title}>
              <Input maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Description" error={errors.description}>
              <Textarea rows={3} maxLength={600} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Hashtag" error={errors.hashtag}>
              <Input maxLength={40} value={form.hashtag} onChange={(e) => setForm({ ...form, hashtag: e.target.value })} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Gift className="h-4 w-4" /> Reward & participation</h3>
            <Field label="Reward description" error={errors.reward_description}>
              <Input maxLength={200} value={form.reward_description} onChange={(e) => setForm({ ...form, reward_description: e.target.value })} />
            </Field>
            <Field label="Participation requirements" error={errors.requirements}>
              <Textarea rows={3} maxLength={400} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Points reward" error={errors.points_reward}>
                <Input type="number" min={0} max={500} value={form.points_reward} onChange={(e) => setForm({ ...form, points_reward: Number(e.target.value) })} />
              </Field>
              <Field label="Max participants" error={errors.max_participants}>
                <Input type="number" min={1} max={10000} value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label={`Duration (days) — ends ${previewDates.end.toLocaleDateString()}`} error={errors.durationDays}>
              <Input type="number" min={1} max={120} value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Review & test</h3>
            {shopLimits && !shopLimits.canAddCampaign && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Your {shopLimits.plan} plan allows{" "}
                {shopLimits.limits.maxActiveCampaigns ?? "unlimited"} active campaign
                {shopLimits.limits.maxActiveCampaigns === 1 ? "" : "s"}.{" "}
                <Link to="/partner/billing" className="underline font-medium">
                  Upgrade billing
                </Link>{" "}
                to publish another.
              </div>
            )}
            <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-orange-100 p-5">
              <div className="text-3xl">{template?.emoji}</div>
              <div className="mt-1 text-xl font-bold">{form.title}</div>
              <p className="text-sm text-zinc-700 mt-1">{form.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <Row label="Reward" value={form.reward_description} />
                <Row label="Points" value={String(form.points_reward)} />
                <Row label="Hashtag" value={form.hashtag} />
                <Row label="Max participants" value={String(form.max_participants)} />
                <Row label="Starts" value={previewDates.start.toLocaleDateString()} />
                <Row label="Ends" value={previewDates.end.toLocaleDateString()} />
              </div>
              {form.requirements && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold">Requirements</div>
                  <p className="text-zinc-700">{form.requirements}</p>
                </div>
              )}
            </div>

            <RulesTester form={form} />
          </div>
        )}

        <div className="flex justify-between mt-6">
          <Button variant="ghost" disabled={step === 0 || saving} onClick={() => { setErrors({}); setStep((s) => Math.max(0, s - 1)); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => {
                if (step === 0) {
                  if (!template) { toast.error("Pick a template to continue"); return; }
                  setStep(1); return;
                }
                const fields = stepFields[step] ?? [];
                const partial = campaignSchema.partial().safeParse(form);
                const errs: Record<string, string> = {};
                if (!partial.success) {
                  for (const issue of partial.error.issues) {
                    const key = issue.path.join(".");
                    if (fields.includes(key as any)) errs[key] = issue.message;
                  }
                }
                // required-on-this-step manual checks (partial allows empty)
                if (step === 1) {
                  if (!form.title.trim() || form.title.trim().length < 3) errs.title = "Title must be at least 3 characters";
                  if (!form.description.trim() || form.description.trim().length < 10) errs.description = "Tell explorers what this is about (10+ characters)";
                }
                if (step === 2) {
                  if (!form.reward_description.trim() || form.reward_description.trim().length < 3) errs.reward_description = "Describe the reward";
                  if (!Number.isFinite(form.points_reward) || form.points_reward < 0 || form.points_reward > 500) errs.points_reward = "0–500 points";
                  if (!Number.isFinite(form.max_participants) || form.max_participants < 1 || form.max_participants > 10000) errs.max_participants = "1–10,000 participants";
                  if (!Number.isFinite(form.durationDays) || form.durationDays < 1 || form.durationDays > 120) errs.durationDays = "1–120 days";
                }
                setErrors(errs);
                if (Object.keys(errs).length > 0) { toast.error("Please fix the highlighted fields"); return; }
                setStep((s) => Math.min(3, s + 1));
              }}
              disabled={step === 0 && !template}
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving || (shopLimits !== null && !shopLimits.canAddCampaign)} className="bg-amber-700 hover:bg-amber-800">
              {saving ? "Publishing…" : (<><Check className="h-4 w-4 mr-1" /> Publish</>)}
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
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

type RuleForm = {
  title: string;
  description: string;
  reward_description: string;
  points_reward: number;
  durationDays: number;
  max_participants: number;
  hashtag: string;
};

function RulesTester({ form }: { form: RuleForm }) {
  const [scenarioJoins, setScenarioJoins] = useState(Math.min(50, form.max_participants));
  const [conversionPct, setConversionPct] = useState(60);

  const cap = Math.max(1, form.max_participants);
  const joins = Math.min(scenarioJoins, cap);
  const redemptions = Math.round((joins * conversionPct) / 100);
  const totalPoints = redemptions * form.points_reward;
  const fillPct = Math.round((joins / cap) * 100);

  const warnings: { tone: "warn" | "info" | "ok"; text: string }[] = [];
  if (form.points_reward === 0) warnings.push({ tone: "info", text: "No bonus points — explorers won't earn extra for redeeming." });
  if (form.points_reward > 100) warnings.push({ tone: "warn", text: "High point reward (>100). Make sure this matches the offer's value." });
  if (form.max_participants < 10) warnings.push({ tone: "warn", text: "Very small cap — campaign may fill within hours." });
  if (form.max_participants > 1000) warnings.push({ tone: "warn", text: "Large cap (>1,000). Make sure staff can handle the volume." });
  if (form.durationDays < 3) warnings.push({ tone: "warn", text: "Short window — consider 7+ days to reach more explorers." });
  if (form.durationDays > 60) warnings.push({ tone: "info", text: "Long window — momentum may dip in the middle." });
  if (!form.reward_description.toLowerCase().match(/free|%|off|bogo|buy/)) warnings.push({ tone: "info", text: "Reward text is vague. ‘Free X’ or ‘XX% off’ converts better." });
  if (warnings.length === 0) warnings.push({ tone: "ok", text: "Looks good. No rule warnings detected." });

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-700">Rules tester</span>
        <span className="text-xs text-zinc-500">Simulate what an explorer would see — before publishing.</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">If {joins} explorers join…</Label>
          <input type="range" min={1} max={cap} value={joins}
            onChange={(e) => setScenarioJoins(Number(e.target.value))}
            className="w-full accent-amber-700" />
          <div className="text-[10px] text-zinc-500">{fillPct}% of {cap}-spot cap</div>
        </div>
        <div>
          <Label className="text-xs">…and {conversionPct}% redeem</Label>
          <input type="range" min={0} max={100} value={conversionPct}
            onChange={(e) => setConversionPct(Number(e.target.value))}
            className="w-full accent-amber-700" />
          <div className="text-[10px] text-zinc-500">Typical EEFFOC: 40–70%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Pill label="Redemptions" value={redemptions} />
        <Pill label="Points awarded" value={totalPoints} />
        <Pill label="Per day avg." value={Math.max(1, Math.round(redemptions / Math.max(1, form.durationDays)))} />
      </div>

      <div className="space-y-2">
        {warnings.map((w, i) => (
          <div key={i} className={`text-xs rounded-lg px-3 py-2 ${
            w.tone === "warn" ? "bg-amber-50 text-amber-900 border border-amber-200" :
            w.tone === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
            "bg-zinc-50 text-zinc-700 border border-zinc-200"
          }`}>
            {w.tone === "warn" ? "⚠️ " : w.tone === "ok" ? "✓ " : "ℹ️ "}{w.text}
          </div>
        ))}
      </div>

      <div className="rounded-xl border-dashed border-2 border-zinc-200 p-3">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Explorer preview</div>
        <div className="text-sm">
          <span className="font-semibold">{form.title || "Your campaign"}</span> · {form.reward_description || "Reward"} · <span className="text-amber-700">+{form.points_reward} pts</span>
        </div>
        <div className="text-xs text-zinc-500 mt-1">{form.hashtag} · Ends in {form.durationDays} days · {cap} spots</div>
      </div>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 p-3">
      <div className="text-2xl font-bold text-amber-900">{value.toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-widest text-amber-700">{label}</div>
    </div>
  );
}
