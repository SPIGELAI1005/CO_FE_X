import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Inbox,
  Megaphone,
} from "lucide-react";
import { PARTNER_BTN, PARTNER_CHIP, PARTNER_CHIP_ACTIVE, PartnerStatusPill } from "@/components/app/partner/PartnerShell";

export const Route = createFileRoute("/_authenticated/partner/submissions")({
  head: () => ({ meta: [{ title: "Social submissions · Partner" }] }),
  component: SubmissionsPage,
});

type Submission = {
  id: string;
  user_id: string;
  campaign_id: string;
  platform: string;
  submission_type: string;
  url: string | null;
  screenshot_path: string | null;
  caption: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  review_notes: string | null;
  redemption_code: string | null;
  points_awarded: number | null;
  campaigns: { title: string; hashtag: string | null; points_reward: number } | null;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

function SubmissionsPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("social_submissions")
      .select("*, campaigns(title, hashtag, points_reward), profiles!social_submissions_user_id_fkey(display_name, avatar_url)")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data as Submission[]) ?? [];
    setItems(rows);

    const toSign = rows.filter((r) => r.screenshot_path).map((r) => r.screenshot_path!);
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from("social-proof").createSignedUrls(toSign, 60 * 60);
      const map: Record<string, string> = {};
      signed?.forEach((s) => {
        if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
      });
      setSignedUrls(map);
    } else {
      setSignedUrls({});
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(id: string, decision: "approved" | "rejected", notes?: string) {
    const { error } = await supabase.rpc("review_social_submission", {
      _submission_id: id,
      _decision: decision,
      _notes: notes ?? null,
    });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(decision === "approved" ? "Approved & reward unlocked" : "Rejected");
    load();
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Social proof"
        title="Social submissions"
        subtitle="Approve explorer posts to unlock their campaign reward and generate a redemption code."
      />
      <AppPageBody className="max-w-5xl pb-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {(["pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={tab === t ? PARTNER_CHIP_ACTIVE : PARTNER_CHIP}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[color:var(--cofex-black)]/55">
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="cofex-app-card cofex-app-card-dashed p-12 text-center shadow-none">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-[color:var(--cofex-black)]/25" />
            <p className="text-sm text-[color:var(--cofex-black)]/55">No {tab} submissions yet.</p>
            {tab === "pending" && (
              <p className="mt-2 text-xs text-[color:var(--cofex-black)]/45">
                Share your campaign QR at the counter so explorers can join and submit proof.
              </p>
            )}
            <Button asChild variant="outline" className="mt-4 rounded-full">
              <Link to="/partner/campaigns">
                <Megaphone className="mr-1 h-4 w-4" /> View campaigns
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((s) => (
              <SubmissionCard
                key={s.id}
                s={s}
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

function SubmissionCard({
  s,
  signedUrl,
  onReview,
}: {
  s: Submission;
  signedUrl?: string;
  onReview: (id: string, d: "approved" | "rejected", notes?: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(d: "approved" | "rejected") {
    setBusy(true);
    await onReview(s.id, d, notes);
    setBusy(false);
  }
  return (
    <div className="cofex-app-card flex flex-col gap-4 p-4 sm:flex-row">
      <div className="w-full shrink-0 sm:w-40">
        {signedUrl ? (
          <a href={signedUrl} target="_blank" rel="noreferrer">
            <img src={signedUrl} alt="proof" className="h-40 w-full rounded-xl border object-cover sm:w-40" />
          </a>
        ) : s.url ? (
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-40 w-full flex-col items-center justify-center gap-1 rounded-xl border bg-[color:var(--cofex-cream)] p-2 text-xs text-[color:var(--cofex-black)]/65 hover:bg-[color:var(--cofex-pastel-blue)]/30 sm:w-40"
          >
            <ExternalLink className="h-5 w-5" />
            <span className="w-full truncate text-center">Open link</span>
          </a>
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-xl border bg-[color:var(--cofex-cream)] sm:w-40">
            <ImageIcon className="h-5 w-5 text-[color:var(--cofex-black)]/25" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-bold text-[color:var(--cofex-coffee-deep)]">
              {s.campaigns?.title ?? "Campaign"}
            </div>
            <div className="text-xs text-[color:var(--cofex-black)]/55">
              {s.profiles?.display_name ?? "Explorer"} ·{" "}
              <span className="capitalize">{s.platform.replace("_", " ")}</span> ·{" "}
              {new Date(s.created_at).toLocaleString()}
            </div>
          </div>
          <StatusPill status={s.status} />
        </div>
        {s.url && (
          <a href={s.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-[color:var(--cofex-cyan)] underline">
            {s.url}
          </a>
        )}
        {s.caption && <div className="text-sm text-[color:var(--cofex-black)]/75">{s.caption}</div>}
        {s.review_notes && <div className="text-xs italic text-[color:var(--cofex-black)]/45">Note: {s.review_notes}</div>}
        {s.redemption_code && (
          <div className="text-xs">
            Code:{" "}
            <span className="font-mono font-bold tracking-widest text-[color:var(--cofex-coffee-deep)]">
              {s.redemption_code}
            </span>{" "}
            · +{s.points_awarded} pts
          </div>
        )}

        {s.status === "pending" && (
          <div className="space-y-2 pt-2">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note to the explorer" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => act("approved")} className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="mr-1 h-4 w-4" /> Approve & unlock reward
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("rejected")} className="rounded-full">
                <XCircle className="mr-1 h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved")
    return (
      <PartnerStatusPill tone="success">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </PartnerStatusPill>
    );
  if (status === "rejected")
    return (
      <PartnerStatusPill tone="danger">
        <XCircle className="h-3 w-3" /> Rejected
      </PartnerStatusPill>
    );
  return (
    <PartnerStatusPill tone="warn">
      <Clock className="h-3 w-3" /> Pending
    </PartnerStatusPill>
  );
}
