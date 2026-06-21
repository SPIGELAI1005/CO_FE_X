import { useState } from "react";
import { Star, Camera, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useShopReviews, useMyReview, useUpsertReview, reviewStats } from "@/lib/queries/reviews";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { uploadReviewPhoto } from "@/lib/review-media";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const { user } = useUser();
  const reviewsQuery = useShopReviews(shopId);
  const myReviewQuery = useMyReview(shopId, user?.id);
  const upsert = useUpsertReview();

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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

  function onPhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (displayRating < 1) return toast.error(t("reviews.pickRating"));
    setUploading(true);
    try {
      let mediaUrls: string[] = myReview?.media_urls ?? [];
      if (photoFile) {
        const url = await uploadReviewPhoto(user.id, photoFile);
        mediaUrls = [url];
      }
      await upsert.mutateAsync({
        shopId,
        userId: user.id,
        rating: displayRating,
        body: displayBody,
        mediaUrls,
        existingId: myReview?.id,
      });
      setEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success(myReview ? t("reviews.updated") : t("reviews.posted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reviews.failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <section id="reviews" className="scroll-mt-24 space-y-5 rounded-2xl bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("reviews.title")}</h2>
        <QueryBoundary query={reviewsQuery} loadingLabel={t("reviews.loading")}>
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
                      {r.media_urls?.[0] ? (
                        <img src={r.media_urls[0]} alt="" className="mt-2 max-h-48 w-full rounded-lg object-cover" />
                      ) : null}
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
          <Label>{myReview && !editing ? t("reviews.yourReview") : t("reviews.reviewShop", { name: shopName })}</Label>
          {myReview && !editing ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
              <p className="tabular-nums">{"★".repeat(myReview.rating)}{"☆".repeat(5 - myReview.rating)}</p>
              {myReview.media_urls?.[0] ? (
                <img src={myReview.media_urls[0]} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />
              ) : null}
              {myReview.body && <p className="mt-2 text-muted-foreground">{myReview.body}</p>}
              <Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={startEdit}>
                {t("reviews.edit")}
              </Button>
            </div>
          ) : (
            <>
              <StarPicker value={displayRating} onChange={setRating} />
              <Textarea
                placeholder={t("reviews.placeholder")}
                rows={3}
                maxLength={500}
                value={displayBody}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold">
                  <Camera className="h-3.5 w-3.5" /> {t("reviews.addPhoto")}
                  <input type="file" accept="image/*" className="sr-only" onChange={onPhotoPick} />
                </label>
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-12 w-12 rounded-lg object-cover ring-2 ring-[color:var(--cofex-cyan)]" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{t("reviews.photoBonusHint")}</p>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={upsert.isPending || uploading || displayRating < 1}>
                  {upsert.isPending || uploading ? t("reviews.saving") : myReview ? t("reviews.update") : t("reviews.post")}
                </Button>
                {editing && myReview && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
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
