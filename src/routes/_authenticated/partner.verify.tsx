import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Clock, ScanLine, Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partner/verify")({
  head: () => ({ meta: [{ title: "Verify code — CO:FE(X)" }] }),
  component: VerifyPage,
});

type VerifyResult = {
  result: "ok" | "already_used" | "not_found" | "not_yours" | "rate_limited";
  redemption_code: string;
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
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [latest, setLatest] = useState<VerifyResult | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  async function loadAudit() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("redemption_verifications")
      .select("id, code, result, verified_at, campaign_id")
      .eq("partner_id", user.id)
      .order("verified_at", { ascending: false })
      .limit(25);
    setAudit(data ?? []);
    const sinceHour = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("redemption_verifications")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", user.id)
      .gte("verified_at", sinceHour);
    setRemaining(Math.max(0, 60 - (count ?? 0)));
  }

  useEffect(() => { loadAudit(); }, []);

  async function verify() {
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_redemption_code", { _code: code.trim(), _ip: null });
    setBusy(false);
    if (error) {
      toast.error(error.message.replace(/^.*?: /, ""));
      setLatest(null);
      loadAudit();
      return;
    }
    setLatest(data as VerifyResult);
    if ((data as any).result === "ok") toast.success("Code verified ✓");
    else if ((data as any).result === "already_used") toast.warning("Code already redeemed");
    setCode("");
    loadAudit();
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Counter tools</div>
        <h1 className="text-3xl font-serif font-bold mt-1 inline-flex items-center gap-2">
          <Shield className="h-7 w-7 text-amber-700" /> Verify redemption code
        </h1>
        <p className="text-sm text-muted-foreground">Ask the explorer to show their code and enter it below. Each attempt is logged.</p>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              autoFocus
              placeholder="Enter 8-character code"
              maxLength={16}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              onKeyDown={(e) => { if (e.key === "Enter") verify(); }}
              className="pl-9 font-mono text-lg tracking-[0.3em] uppercase"
            />
          </div>
          <Button onClick={verify} disabled={busy || code.length < 4} className="bg-amber-700 hover:bg-amber-800">
            {busy ? "Verifying…" : "Verify"}
          </Button>
        </div>
        {remaining !== null && (
          <p className="mt-2 text-xs text-zinc-500 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {remaining} of 60 attempts left this hour
          </p>
        )}
      </div>

      {latest && (
        <div className={`mt-5 rounded-2xl border-2 p-5 ${
          latest.result === "ok" ? "border-emerald-400 bg-emerald-50" :
          latest.result === "already_used" ? "border-amber-400 bg-amber-50" :
          "border-rose-400 bg-rose-50"
        }`}>
          <div className="flex items-start gap-3">
            {latest.result === "ok" && <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />}
            {latest.result === "already_used" && <AlertTriangle className="h-8 w-8 text-amber-600 shrink-0" />}
            {(latest.result === "not_found" || latest.result === "not_yours") && <XCircle className="h-8 w-8 text-rose-600 shrink-0" />}
            <div className="flex-1">
              <div className="text-lg font-semibold">
                {latest.result === "ok" && "Redemption confirmed"}
                {latest.result === "already_used" && "Already redeemed"}
                {latest.result === "not_found" && "Code not found"}
                {latest.result === "not_yours" && "Code belongs to another café"}
              </div>
              {latest.campaign_title && (
                <div className="mt-2 text-sm">
                  <div className="font-medium">{latest.campaign_title}</div>
                  {latest.reward && <div className="inline-flex items-center gap-1 text-zinc-700 mt-1"><Gift className="h-3.5 w-3.5" /> {latest.reward}</div>}
                </div>
              )}
              {latest.used_at && (
                <div className="mt-2 text-xs text-zinc-600">Marked used at {new Date(latest.used_at).toLocaleString()}</div>
              )}
              <div className="mt-2 font-mono text-xs text-zinc-500">{latest.redemption_code}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">Audit log</h2>
        <div className="rounded-2xl border bg-white overflow-hidden">
          {audit.length === 0 ? (
            <div className="p-6 text-sm text-zinc-500 text-center">No verifications yet.</div>
          ) : (
            audit.map((r) => <AuditRow key={r.id} row={r} />)
          )}
        </div>
      </div>
    </div>
  );
}

function AuditRow({ row }: { row: AuditRow }) {
  const colors: Record<string, string> = {
    ok: "bg-emerald-100 text-emerald-700",
    already_used: "bg-amber-100 text-amber-700",
    not_found: "bg-rose-100 text-rose-700",
    not_yours: "bg-rose-100 text-rose-700",
    rate_limited: "bg-zinc-200 text-zinc-700",
  };
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b last:border-0 text-sm">
      <div className="flex items-center gap-3">
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${colors[row.result] ?? "bg-zinc-100 text-zinc-700"}`}>
          {row.result.replace("_", " ")}
        </span>
        <span className="font-mono text-zinc-700">{row.code}</span>
      </div>
      <span className="text-xs text-zinc-500">{new Date(row.verified_at).toLocaleString()}</span>
    </div>
  );
}
