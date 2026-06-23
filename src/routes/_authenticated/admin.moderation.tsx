import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminModerationQueue,
  useAdminModerateFeedItem,
  useAdminModerateMoment,
  useAdminReviewContentReport,
  feedItemImageUrl,
  momentImageUrl,
} from "@/lib/queries/admin-moderation";
import { AdminCard, AdminLoading, AdminPage, AdminSection, AdminStatusBadge } from "@/components/app/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Flag, Image, MessageSquareWarning, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/moderation")({
  head: () => ({ meta: [{ title: "Content moderation · Admin" }] }),
  component: AdminModerationPage,
});

function AdminModerationPage() {
  const { data, isLoading } = useAdminModerationQueue();
  const moderateFeed = useAdminModerateFeedItem();
  const moderateMoment = useAdminModerateMoment();
  const reviewReport = useAdminReviewContentReport();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (isLoading) return <AdminLoading />;

  return (
    <AdminPage
      title="Content moderation"
      subtitle="Review moments, feed items, and user reports. Hide or remove inappropriate content."
    >
      <p className="mb-6 text-sm text-[color:var(--cofex-black)]/60">
        {data?.hidden_count ?? 0} items hidden or removed · {data?.reports.length ?? 0} open reports
      </p>

      <div className="space-y-10">
        <AdminSection
          title="Abuse reports"
          icon={Flag}
          count={data?.reports.length}
          empty={!data?.reports.length}
          emptyText="No open content reports."
        >
          {data?.reports.map((r) => (
            <AdminCard key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize text-[color:var(--cofex-coffee-deep)]">
                    {r.target_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm">{r.reason}</p>
                  {r.details && <p className="text-sm text-[color:var(--cofex-black)]/60">{r.details}</p>}
                  <p className="mt-1 text-xs text-[color:var(--cofex-black)]/45">
                    Reported by {r.reporter_name ?? "user"} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <AdminStatusBadge status={r.status} />
              </div>
              <Textarea
                placeholder="Admin notes (optional)"
                className="min-h-[60px] text-sm"
                value={notes[`report-${r.id}`] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [`report-${r.id}`]: e.target.value }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reviewReport.isPending}
                  onClick={async () => {
                    try {
                      await reviewReport.mutateAsync({
                        reportId: r.id,
                        status: "dismissed",
                        adminNotes: notes[`report-${r.id}`],
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
                        reportId: r.id,
                        status: "reviewed",
                        adminNotes: notes[`report-${r.id}`],
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
            </AdminCard>
          ))}
        </AdminSection>

        <AdminSection
          title="Explorer moments"
          icon={Sparkles}
          count={data?.moments.length}
          empty={!data?.moments.length}
          emptyText="No recent moments to review."
        >
          {data?.moments.map((m) => {
            const img = momentImageUrl(m.image_path);
            return (
              <AdminCard key={m.id} className="flex flex-col gap-3 sm:flex-row">
                {img && (
                  <img src={img} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{m.author_name ?? m.user_id.slice(0, 8)}</p>
                  <p className="text-sm text-[color:var(--cofex-black)]/60">
                    {m.shop_name ?? "No café"} · {m.drink_type ?? "moment"} ·{" "}
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                  {m.caption && <p className="mt-1 text-sm">{m.caption}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderateMoment.isPending}
                      onClick={async () => {
                        try {
                          await moderateMoment.mutateAsync({ momentId: m.id, status: "hidden" });
                          toast.success("Moment hidden");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={moderateMoment.isPending}
                      onClick={async () => {
                        try {
                          await moderateMoment.mutateAsync({ momentId: m.id, status: "removed" });
                          toast.success("Moment removed");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </AdminSection>

        <AdminSection
          title="Feed items"
          icon={Image}
          count={data?.feed_items.length}
          empty={!data?.feed_items.length}
          emptyText="No feed items to review."
        >
          {data?.feed_items.map((f) => {
            const img = feedItemImageUrl(f);
            return (
              <AdminCard key={f.id} className="flex flex-col gap-3 sm:flex-row">
                {img && <img src={img} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold capitalize">{f.source_type.replace(/_/g, " ")}</p>
                  <p className="text-sm text-[color:var(--cofex-black)]/60">
                    {f.author_name ?? f.author_handle ?? f.user_id.slice(0, 8)} · {f.shop_name ?? "—"} ·{" "}
                    {new Date(f.published_at).toLocaleString()}
                  </p>
                  {f.caption && <p className="mt-1 text-sm">{f.caption}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderateFeed.isPending}
                      onClick={async () => {
                        try {
                          await moderateFeed.mutateAsync({ feedItemId: f.id, status: "hidden" });
                          toast.success("Feed item hidden");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Hide
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={moderateFeed.isPending}
                      onClick={async () => {
                        try {
                          await moderateFeed.mutateAsync({ feedItemId: f.id, status: "removed" });
                          toast.success("Feed item removed");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </AdminSection>

        <AdminSection title="Moderation tips" icon={MessageSquareWarning}>
          <AdminCard className="text-sm text-[color:var(--cofex-black)]/65">
            Hidden items stay in the database but are excluded from public feeds. Removed items are flagged for audit
            and should not appear in discovery. Pair removals with trust actions on repeat offenders via Trust & fraud.
          </AdminCard>
        </AdminSection>
      </div>
    </AdminPage>
  );
}
