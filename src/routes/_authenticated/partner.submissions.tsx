import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ExternalLink, Image as ImageIcon, Loader2, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/submissions")({
  head: () => ({ meta: [{ title: "Social submissions — Partner" }] }),
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
    const { data } = await (supabase as any)
      .from("social_submissions")
      .select("*, campaigns(title, hashtag, points_reward), profiles!social_submissions_user_id_fkey(display_name, avatar_url)")
      .eq("status", tab)
      .order("created_at", { ascending: false })
      .limit(100);
    const rows = (data as Submission[]) ?? [];
    setItems(rows);

    // Sign screenshot URLs
    const toSign = rows.filter((r) => r.screenshot_path).map((r) => r.screenshot_path!);
    if (toSign.length) {
      const { data: signed } = await supabase.storage.from("social-proof").createSignedUrls(toSign, 60 * 60);
      const map: Record<string, string> = {};
      signed?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl; });
      setSignedUrls(map);
    } else {
      setSignedUrls({});
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, decision: "approved" | "rejected", notes?: string) {
    const { error } = await (supabase as any).rpc("review_social_submission", {
      _submission_id: id,
      _decision: decision,
      _notes: notes ?? null,
    });
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(decision === "approved" ? "Approved & reward unlocked" : "Rejected");
    load();
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Social submissions</h1>
        <p className="text-sm text-muted-foreground">Approve explorer posts to instantly award their campaign reward.</p>
      </div>

      <div className="flex gap-1 border-b">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              tab === t ? "border-amber-700 text-amber-900" : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No {tab} submissions yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((s) => (
            <SubmissionCard key={s.id} s={s} signedUrl={s.screenshot_path ? signedUrls[s.screenshot_path] : undefined} onReview={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ s, signedUrl, onReview }: { s: Submission; signedUrl?: string; onReview: (id: string, d: "approved" | "rejected", notes?: string) => void }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  async function act(d: "approved" | "rejected") {
    setBusy(true);
    await onReview(s.id, d, notes);
    setBusy(false);
  }
  return (
    <div className="rounded-2xl border bg-white p-4 flex gap-4">
      <div className="w-40 shrink-0">
        {signedUrl ? (
          <a href={signedUrl} target="_blank" rel="noreferrer">
            <img src={signedUrl} alt="proof" className="w-40 h-40 object-cover rounded-xl border" />
          </a>
        ) : s.url ? (
          <a href={s.url} target="_blank" rel="noreferrer" className="w-40 h-40 rounded-xl border bg-zinc-50 flex flex-col items-center justify-center text-xs text-zinc-600 gap-1 p-2 hover:bg-zinc-100">
            <ExternalLink className="h-5 w-5" />
            <span className="text-center truncate w-full">Open link</span>
          </a>
        ) : (
          <div className="w-40 h-40 rounded-xl border bg-zinc-50 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-zinc-400" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 truncate">{s.campaigns?.title ?? "Campaign"}</div>
            <div className="text-xs text-zinc-500">
              {s.profiles?.display_name ?? "Explorer"} · <span className="capitalize">{s.platform.replace("_", " ")}</span> · {new Date(s.created_at).toLocaleString()}
            </div>
          </div>
          <StatusPill status={s.status} />
        </div>
        {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-amber-700 underline truncate block">{s.url}</a>}
        {s.caption && <div className="text-sm text-zinc-700">{s.caption}</div>}
        {s.review_notes && <div className="text-xs text-zinc-500 italic">Note: {s.review_notes}</div>}
        {s.redemption_code && (
          <div className="text-xs">Code: <span className="font-mono font-bold text-amber-800 tracking-widest">{s.redemption_code}</span> · +{s.points_awarded} pts</div>
        )}

        {s.status === "pending" && (
          <div className="pt-2 space-y-2">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note to the explorer" />
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => act("approved")} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve & unlock reward
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("rejected")}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-xs whitespace-nowrap"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 text-xs whitespace-nowrap"><XCircle className="h-3 w-3" /> Rejected</span>;
  return <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 text-xs whitespace-nowrap"><Clock className="h-3 w-3" /> Pending</span>;
}
