import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Link2, Music2, Instagram, Facebook, Image as ImageIcon, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Platform = "tiktok" | "instagram_story" | "instagram_post" | "facebook_post" | "screenshot";

const PLATFORMS: { id: Platform; label: string; type: "link" | "screenshot"; Icon: any; placeholder?: string }[] = [
  { id: "tiktok", label: "TikTok link", type: "link", Icon: Music2, placeholder: "https://www.tiktok.com/@you/video/..." },
  { id: "instagram_post", label: "Instagram post link", type: "link", Icon: Instagram, placeholder: "https://instagram.com/p/..." },
  { id: "instagram_story", label: "Instagram story screenshot", type: "screenshot", Icon: Instagram },
  { id: "facebook_post", label: "Facebook post link", type: "link", Icon: Facebook, placeholder: "https://facebook.com/..." },
  { id: "screenshot", label: "Other screenshot", type: "screenshot", Icon: ImageIcon },
];

type Submission = {
  id: string;
  platform: string;
  status: "pending" | "approved" | "rejected";
  url: string | null;
  review_notes: string | null;
  redemption_code: string | null;
  created_at: string;
};

export function SocialProofSubmit({ campaignId, hashtag }: { campaignId: string; hashtag?: string | null }) {
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [subs, setSubs] = useState<Submission[]>([]);

  const meta = PLATFORMS.find((p) => p.id === platform)!;

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase as any)
      .from("social_submissions")
      .select("id, platform, status, url, review_notes, redemption_code, created_at")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs((data as Submission[]) ?? []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [campaignId]);

  async function submit() {
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        if (!url.trim()) throw new Error("Paste your link");
        try { new URL(url); } catch { throw new Error("Invalid URL"); }
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
      toast.success("Submitted! The café will review it soon.");
      setUrl(""); setFile(null); setCaption("");
      load();
    } catch (e: any) {
      toast.error(e.message?.replace(/^.*?: /, "") ?? "Failed");
    } finally { setBusy(false); }
  }

  const hasPending = subs.some((s) => s.status === "pending");

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border space-y-4">
      <div>
        <h3 className="font-semibold text-zinc-900">Share on social → unlock reward</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Post about your visit{hashtag ? ` with ${hashtag}` : ""} and submit proof. The café approves and your reward unlocks instantly.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            className={`rounded-xl border p-2.5 text-xs flex flex-col items-center gap-1.5 transition ${
              platform === p.id ? "border-amber-600 bg-amber-50 text-amber-900" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            <p.Icon className="h-4 w-4" />
            <span className="text-center leading-tight">{p.label}</span>
          </button>
        ))}
      </div>

      {meta.type === "link" ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 inline-flex items-center gap-1"><Link2 className="h-3 w-3" /> Paste link</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={meta.placeholder} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-700 inline-flex items-center gap-1"><Upload className="h-3 w-3" /> Upload screenshot (max 8MB)</label>
          <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      )}

      <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Optional note for the café (caption, handle…)" rows={2} />

      <Button onClick={submit} disabled={busy || hasPending} className="w-full bg-amber-700 hover:bg-amber-800">
        {busy ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…</> : hasPending ? "Submission pending review" : "Submit for review"}
      </Button>

      {subs.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs font-semibold text-zinc-700">Your submissions</div>
          {subs.map((s) => (
            <div key={s.id} className="rounded-lg border p-2.5 text-xs flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-zinc-900 capitalize">{s.platform.replace("_", " ")}</div>
                {s.url && <a href={s.url} target="_blank" rel="noreferrer" className="text-zinc-500 truncate block underline">{s.url}</a>}
                {s.review_notes && <div className="text-zinc-500 mt-0.5">"{s.review_notes}"</div>}
                {s.redemption_code && <div className="mt-1 font-mono text-amber-800 font-bold tracking-widest">{s.redemption_code}</div>}
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
  if (status === "approved") return <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 whitespace-nowrap"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
  if (status === "rejected") return <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 whitespace-nowrap"><XCircle className="h-3 w-3" /> Rejected</span>;
  return <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap"><Clock className="h-3 w-3" /> Pending</span>;
}
