import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useShopReviews, useMyReview, useUpsertReview, reviewStats } from "@/lib/queries/reviews";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 rounded transition-transform hover:scale-110"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            className="h-7 w-7"
            style={{
              color: "var(--cofex-accent-gold, #c8a063)",
              fill: n <= value ? "var(--cofex-accent-gold, #c8a063)" : "transparent",
            }}
          />
        </button>
      ))}
    </div>
  );
}

export function ReviewSection({ shopId, shopName }: { shopId: string; shopName: string }) {
  const { user } = useUser();
  const reviewsQuery = useShopReviews(shopId);
  const myReviewQuery = useMyReview(shopId, user?.id);
  const upsert = useUpsertReview();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);

  const myReview = myReviewQuery.data;
  const displayRating = editing ? rating : (myReview?.rating ?? rating);
  const displayBody = editing ? body : (myReview?.body ?? body);

  function startEdit() {
    if (myReview) {
      setRating(myReview.rating);
      setBody(myReview.body ?? "");
    }
    setEditing(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (displayRating < 1) return toast.error("Pick a star rating");
    try {
      await upsert.mutateAsync({
        shopId,
        userId: user.id,
        rating: displayRating,
        body: displayBody,
        existingId: myReview?.id,
      });
      setEditing(false);
      toast.success(myReview ? "Review updated" : "Review posted — +5 points!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save review");
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reviews
        </h2>
        <QueryBoundary query={reviewsQuery} loadingLabel="Loading reviews…">
          {(reviews) => {
            const stats = reviewStats(reviews);
            return (
              <>
                {stats.count > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Star
                      className="inline h-4 w-4 fill-current mr-0.5"
                      style={{ color: "var(--cofex-accent-gold)" }}
                    />
                    {stats.average.toFixed(1)} · {stats.count} review{stats.count !== 1 ? "s" : ""}
                  </p>
                )}
                <ul className="mt-4 space-y-3">
                  {reviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border p-3 text-sm"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          {r.profiles?.display_name ?? "Explorer"}
                          {r.user_id === user?.id && (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          )}
                        </span>
                        <span className="text-xs tabular-nums">
                          {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                        </span>
                      </div>
                      {r.body && <p className="mt-2 text-muted-foreground">{r.body}</p>}
                    </li>
                  ))}
                </ul>
              </>
            );
          }}
        </QueryBoundary>
      </div>

      {user && (
        <form onSubmit={submit} className="border-t pt-5 space-y-3" style={{ borderColor: "var(--border)" }}>
          <Label>{myReview && !editing ? "Your review" : `Review ${shopName}`}</Label>
          {myReview && !editing ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
              <p className="tabular-nums">{"★".repeat(myReview.rating)}{"☆".repeat(5 - myReview.rating)}</p>
              {myReview.body && <p className="mt-2 text-muted-foreground">{myReview.body}</p>}
              <Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={startEdit}>
                Edit review
              </Button>
            </div>
          ) : (
            <>
              <StarPicker value={displayRating} onChange={setRating} />
              <Textarea
                placeholder="What did you love about this café? (optional)"
                rows={3}
                maxLength={500}
                value={displayBody}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={upsert.isPending || displayRating < 1}>
                  {upsert.isPending ? "Saving…" : myReview ? "Update review" : "Post review (+5 pts)"}
                </Button>
                {editing && myReview && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}
        </form>
      )}
    </section>
  );
}
