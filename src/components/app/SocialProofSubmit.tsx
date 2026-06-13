import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  SOCIAL_PLATFORMS,
  type SocialPlatform,
  openSocialCompose,
  copyCaption,
  getSocialPlatform,
} from "@/lib/social-share-links";
import { buildCaptionTemplate, type CampaignSocialRequirements } from "@/lib/campaign-fulfillment";
import { trackExplorerEvent } from "@/lib/explorer-analytics";

type Submission = {
  id: string;
  platform: string;
  status: "pending" | "approved" | "rejected";
  url: string | null;
  review_notes: string | null;
  redemption_code: string | null;
  created_at: string;
};

interface SocialProofSubmitProps {
  campaignId: string;
  hashtag?: string | null;
  shopName?: string;
  campaignTitle?: string;
  socialRequirements?: CampaignSocialRequirements;
  allowedPlatforms?: string[];
}

export function SocialProofSubmit({
  campaignId,
  hashtag,
  shopName = "the café",
  campaignTitle = "this campaign",
  socialRequirements,
  allowedPlatforms,
}: SocialProofSubmitProps) {
  const platformOptions = useMemo(() => {
    const allowed = allowedPlatforms ?? socialRequirements?.platforms;
    if (!allowed?.length) return SOCIAL_PLATFORMS;
    return SOCIAL_PLATFORMS.filter((p) => allowed.includes(p.id));
  }, [allowedPlatforms, socialRequirements?.platforms]);

  const [platform, setPlatform] = useState<SocialPlatform>(platformOptions[0]?.id ?? "tiktok");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);

  const suggestedCaption = useMemo(
    () =>
      buildCaptionTemplate(socialRequirements?.caption_template, {
        shop_name: shopName,
        hashtag: hashtag?.startsWith("#") ? hashtag : `#${hashtag ?? "WeGiveEEFFOC"}`,
        campaign_title: campaignTitle,
      }),
    [socialRequirements?.caption_template, shopName, hashtag, campaignTitle],
  );

  useEffect(() => {
    if (!caption) setCaption(suggestedCaption);
  }, [suggestedCaption, caption]);

  const meta = getSocialPlatform(platform) ?? SOCIAL_PLATFORMS[0];

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("social_submissions")
      .select("id, platform, status, url, review_notes, redemption_code, created_at")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs((data as Submission[]) ?? []);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  async function handleCompose() {
    trackExplorerEvent("post_checkin_action", { action: "social_compose", platform });
    const copied = await copyCaption(caption || suggestedCaption);
    if (copied) toast.success("Caption copied. Paste it in your post");
    openSocialCompose(platform, caption || suggestedCaption);
  }

  async function submit() {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      let screenshot_path: string | null = null;
      if (meta.type === "screenshot") {
        if (!file) throw new Error("Pick a screenshot");
        if (file.size > 8 * 1024 * 1024) throw new Error("Max 8MB");
        const ext = file.name.split(".").pop() ?? "png";
        const path = `${user.id}/${campaignId}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("social-proof").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        screenshot_path = path;
      } else {
        if (!url.trim()) throw new Error("Paste your post link");
        try {
          new URL(url);
        } catch {
          throw new Error("Invalid URL");
        }
      }
      const { error } = await supabase.rpc("submit_social_proof", {
        _campaign_id: campaignId,
        _platform: platform,
        _submission_type: meta.type,
        _url: meta.type === "link" ? url.trim() : null,
        _screenshot_path: screenshot_path,
        _caption: caption.trim() || null,
      });
      if (error) throw error;
      trackExplorerEvent("post_checkin_action", { action: "social_proof_submitted", platform });
      toast.success("Submitted! The café will review your post soon.");
      setUrl("");
      setFile(null);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message.replace(/^.*?: /, "") : "Failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const hasPending = subs.some((s) => s.status === "pending");

  return (
    <div className="cofex-app-card space-y-4 p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-[color:var(--cofex-coffee-deep)]">
          <Sparkles className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
          Share on social → unlock reward
        </h3>
        <p className="mt-1 text-xs text-[color:var(--cofex-black)]/55">
          Create your post{hashtag ? ` with ${hashtag}` : ""}, submit proof, and get your reward QR when the café
          approves.
        </p>
        {socialRequirements?.media_hints ? (
          <p className="mt-2 rounded-xl bg-[color:var(--cofex-pastel-blue)] px-3 py-2 text-xs text-[color:var(--cofex-coffee-deep)]">
            {socialRequirements.media_hints}
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--cofex-cream)]/40 p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">
          Suggested caption
        </div>
        <p className="mt-1 text-sm text-[color:var(--cofex-coffee-deep)]">{caption || suggestedCaption}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full text-xs"
            onClick={async () => {
              const ok = await copyCaption(caption || suggestedCaption);
              toast.success(ok ? "Caption copied" : "Could not copy");
            }}
          >
            <Copy className="mr-1 h-3.5 w-3.5" /> Copy caption
          </Button>
          <Button type="button" size="sm" className="rounded-full bg-amber-700 text-xs hover:bg-amber-800" onClick={handleCompose}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" /> {meta.composeLabel}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {platformOptions.map((p) => {
          const Icon = p.id === "tiktok" ? Link2 : p.id.includes("instagram") ? Upload : Link2;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={`rounded-xl border p-2.5 text-xs transition ${
                platform === p.id
                  ? "border-amber-600 bg-amber-50 text-amber-900"
                  : "border-[color:var(--border)] text-[color:var(--cofex-black)]/65 hover:border-amber-300"
              }`}
            >
              <span className="block text-center font-medium leading-tight">{p.label}</span>
              <Icon className="mx-auto mt-1 h-4 w-4 opacity-60" />
            </button>
          );
        })}
      </div>

      {meta.type === "link" ? (
        <div className="space-y-1.5">
          <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-coffee-deep)]">
            <Link2 className="h-3 w-3" /> Paste your post link
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={meta.placeholder}
            className="rounded-xl"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--cofex-coffee-deep)]">
            <Upload className="h-3 w-3" /> Upload screenshot (max 8MB)
          </label>
          <Input type="file" accept="image/*" className="rounded-xl" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      )}

      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption you'll use (editable)"
        rows={2}
        className="rounded-xl"
      />

      <Button onClick={submit} disabled={busy || hasPending} className="w-full rounded-full bg-amber-700 hover:bg-amber-800">
        {busy ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : hasPending ? (
          "Submission pending review"
        ) : (
          "Submit proof for review"
        )}
      </Button>

      {subs.length > 0 && (
        <div className="space-y-2 border-t border-[color:var(--border)] pt-3">
          <div className="text-xs font-semibold text-[color:var(--cofex-coffee-deep)]">Your submissions</div>
          {subs.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-[color:var(--border)] p-2.5 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium capitalize text-[color:var(--cofex-coffee-deep)]">
                  {s.platform.replace(/_/g, " ")}
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-[color:var(--cofex-black)]/55 underline">
                    {s.url}
                  </a>
                )}
                {s.review_notes && <div className="mt-0.5 text-[color:var(--cofex-black)]/55">{s.review_notes}</div>}
              </div>
              <StatusPill status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}
