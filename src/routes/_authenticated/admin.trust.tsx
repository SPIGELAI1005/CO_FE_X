import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldAlert, QrCode, XCircle, Zap, Flag, Copy, AlertTriangle } from "lucide-react";
import {
  useAdminFraudDashboard,
  useAdminReviewCafeReport,
  useAdminSetUserTrust,
} from "@/lib/queries/admin-fraud";
import { TRUST_STATUS_LABELS, TRUST_STATUS_TONES, type TrustStatus } from "@/lib/anti-fraud";
import { AdminPage, AdminSection } from "@/components/app/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/trust")({
  head: () => ({ meta: [{ title: "Trust & fraud · Admin" }] }),
  component: AdminTrustPage,
});

const TRUST_OPTIONS: TrustStatus[] = ["normal", "watch", "flagged", "restricted"];

function AdminTrustPage() {
  const { data, isLoading } = useAdminFraudDashboard();
  const setTrust = useAdminSetUserTrust();
  const reviewReport = useAdminReviewCafeReport();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminPage
      title="Trust & safety"
      subtitle="Suspicious users, rejected proofs, abuse reports, and duplicate redemption attempts."
      action={
        (data?.open_content_reports ?? 0) > 0 ? (
          <Link
            to="/admin/moderation"
            className="rounded-full bg-[color:var(--cofex-coffee-deep)] px-4 py-2 text-sm font-semibold text-white"
          >
            {data?.open_content_reports} content reports →
          </Link>
        ) : undefined
      }
    >
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <span>
          QR failures (7d): <strong className="tabular-nums">{data?.qr_failures_7d ?? 0}</strong>
        </span>
        <span>
          Open café reports: <strong className="tabular-nums">{data?.cafe_reports.length ?? 0}</strong>
        </span>
        <span>
          Duplicate attempts (7d): <strong className="tabular-nums">{data?.duplicate_redemptions.length ?? 0}</strong>
        </span>
      </div>

      <div className="space-y-10">
        <AdminSection
          title="Suspicious users"
          icon={Flag}
          count={data?.suspicious_users.length}
          empty={!data?.suspicious_users.length}
          emptyText="No flagged explorers right now."
        >
          {data?.suspicious_users.map((u) => (
            <div key={u.id} className="cofex-app-card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{u.display_name ?? u.handle ?? u.id.slice(0, 8)}</p>
                  <p className="text-xs text-[color:var(--cofex-black)]/55">
                    Score {u.fraud_score} · {u.events_7d} events (7d) · {u.total_check_ins} check-ins ·{" "}
                    {u.total_rewards_redeemed} redemptions
                  </p>
                  <Badge className={`mt-1 ${TRUST_STATUS_TONES[u.trust_status]}`}>
                    {TRUST_STATUS_LABELS[u.trust_status]}
                  </Badge>
                </div>
                <Link to="/admin/users" className="text-xs font-semibold text-[color:var(--cofex-cyan)] hover:underline">
                  Full profile →
                </Link>
              </div>
              <Textarea
                placeholder="Moderation notes (optional)"
                className="min-h-[56px] text-sm"
                value={notes[u.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [u.id]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                {TRUST_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={u.trust_status === status ? "default" : "outline"}
                    disabled={setTrust.isPending}
                    onClick={async () => {
                      try {
                        await setTrust.mutateAsync({
                          userId: u.id,
                          trustStatus: status,
                          notes: notes[u.id],
                        });
                        toast.success(`Trust set to ${TRUST_STATUS_LABELS[status]}`);
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Update failed");
                      }
                    }}
                  >
                    {TRUST_STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="Duplicate redemption attempts"
          icon={Copy}
          count={data?.duplicate_redemptions.length}
          empty={!data?.duplicate_redemptions.length}
          emptyText="No duplicate redemption scans in the last 7 days."
        >
          {data?.duplicate_redemptions.map((row) => (
            <div key={row.id} className="cofex-app-card flex flex-wrap justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <span className="font-mono font-semibold">{row.code}</span>
                <span className="ml-2 font-medium text-amber-800">{row.result}</span>
                <p className="mt-0.5 text-xs text-[color:var(--cofex-black)]/55">
                  {row.explorer_name ?? row.explorer_id?.slice(0, 8) ?? "—"} · {row.shop_name ?? "—"} ·{" "}
                  {row.campaign_title ?? "—"}
                </p>
              </div>
              <time className="text-xs text-[color:var(--cofex-black)]/45 shrink-0">
                {new Date(row.verified_at).toLocaleString()}
              </time>
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="Failed verification scans"
          icon={QrCode}
          count={data?.failed_scans.length}
          empty={!data?.failed_scans.length}
          emptyText="No failed verifications recently."
        >
          {data?.failed_scans.map((row) => (
            <div key={row.id} className="cofex-app-card flex flex-wrap justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <span className="font-mono font-semibold">{row.code}</span>
                <span className="ml-2 text-rose-700 font-medium">{row.result}</span>
                <p className="text-xs text-[color:var(--cofex-black)]/55 mt-0.5">
                  {row.shop_name ?? "—"} · {row.campaign_title ?? "—"}
                </p>
              </div>
              <time className="text-xs text-[color:var(--cofex-black)]/45 shrink-0">
                {new Date(row.verified_at).toLocaleString()}
              </time>
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="QR scan failures"
          icon={AlertTriangle}
          count={data?.qr_scan_failures.length}
          empty={!data?.qr_scan_failures.length}
          emptyText="No QR participation failures recently."
        >
          {data?.qr_scan_failures.map((row) => (
            <div key={row.id} className="cofex-app-card flex flex-wrap justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <span className="font-medium text-rose-800">{row.result}</span>
                {row.token && <span className="ml-2 font-mono text-xs">{row.token.slice(0, 12)}…</span>}
                <p className="text-xs text-[color:var(--cofex-black)]/55 mt-0.5">
                  {row.user_name ?? row.user_id?.slice(0, 8) ?? "—"} · {row.shop_name ?? "—"}
                </p>
              </div>
              <time className="text-xs text-[color:var(--cofex-black)]/45 shrink-0">
                {new Date(row.created_at).toLocaleString()}
              </time>
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="Rejected proofs"
          icon={XCircle}
          count={data?.rejected_proofs.length}
          empty={!data?.rejected_proofs.length}
          emptyText="No rejected social proofs recently."
        >
          {data?.rejected_proofs.map((row) => (
            <div key={row.id} className="cofex-app-card px-4 py-3 text-sm">
              <p className="font-semibold">{row.explorer_name ?? row.user_id.slice(0, 8)}</p>
              <p className="text-[color:var(--cofex-black)]/60">
                {row.campaign_title} · {row.platform}
              </p>
              {row.review_notes && <p className="mt-1 text-xs">{row.review_notes}</p>}
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="High redemption frequency (24h)"
          icon={Zap}
          count={data?.high_redemption_users.length}
          empty={!data?.high_redemption_users.length}
          emptyText="No unusual redemption volume."
        >
          {data?.high_redemption_users.map((row) => (
            <div key={row.user_id} className="cofex-app-card flex justify-between px-4 py-3 text-sm">
              <span>{row.display_name ?? row.handle ?? row.user_id.slice(0, 8)}</span>
              <Badge variant="secondary">{row.redemptions_24h} redemptions</Badge>
            </div>
          ))}
        </AdminSection>

        <AdminSection
          title="Café abuse reports"
          icon={ShieldAlert}
          count={data?.cafe_reports.length}
          empty={!data?.cafe_reports.length}
          emptyText="No open café reports."
        >
          {data?.cafe_reports.map((row) => (
            <div key={row.id} className="cofex-app-card space-y-2 p-4 text-sm">
              <p className="font-semibold">{row.shop_name}</p>
              <p>{row.reason}</p>
              {row.details && <p className="text-[color:var(--cofex-black)]/60">{row.details}</p>}
              <p className="text-xs text-[color:var(--cofex-black)]/45">
                Reported by {row.reporter_name ?? "partner"} · {new Date(row.created_at).toLocaleString()}
              </p>
              <Textarea
                placeholder="Admin notes"
                className="min-h-[56px] text-sm"
                value={notes[`report-${row.id}`] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [`report-${row.id}`]: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reviewReport.isPending}
                  onClick={async () => {
                    try {
                      await reviewReport.mutateAsync({
                        reportId: row.id,
                        status: "dismissed",
                        adminNotes: notes[`report-${row.id}`],
                      });
                      toast.success("Report dismissed");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  disabled={reviewReport.isPending}
                  onClick={async () => {
                    try {
                      await reviewReport.mutateAsync({
                        reportId: row.id,
                        status: "reviewed",
                        adminNotes: notes[`report-${row.id}`],
                      });
                      toast.success("Marked reviewed");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Failed");
                    }
                  }}
                >
                  Mark reviewed
                </Button>
              </div>
            </div>
          ))}
        </AdminSection>
      </div>
    </AdminPage>
  );
}
