import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Locate, Shield } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { MomentFeedCard, MomentsEmptyState } from "@/components/app/MomentFeedCard";
import { MomentFeedFilters } from "@/components/app/MomentFeedFilters";
import { UserMomentUpload } from "@/components/app/UserMomentUpload";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { userSharesMoments, type MomentFeedFilter } from "@/lib/moments";
import { useMomentsFeed, useToggleMomentLike, useToggleMomentSave } from "@/lib/queries/moments";
import { useProfile } from "@/lib/queries/profile";

export const Route = createFileRoute("/_authenticated/_explorer/moments")({
  head: () => ({
    meta: [
      { title: "Moments · CO:FE(X)" },
      { name: "description", content: "Discover café moments, beautiful drinks, badges and explorer stories near you." },
    ],
  }),
  component: MomentsPage,
});

function MomentsPage() {
  const { t } = useTranslation();
  const { user } = useUser();
  const profileQuery = useProfile(user?.id);
  const [filter, setFilter] = useState<MomentFeedFilter>("trending");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const feedQuery = useMomentsFeed(filter, filter === "nearby" ? coords : null);
  const likeMutation = useToggleMomentLike(user?.id);
  const saveMutation = useToggleMomentSave(user?.id);

  const canShare = userSharesMoments(profileQuery.data?.privacy_preferences);

  const items = useMemo(
    () => feedQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [feedQuery.data],
  );

  useEffect(() => {
    if (filter !== "nearby" || coords) return;
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [filter, coords]);

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("moments.eyebrow")}
        title={t("moments.title")}
        subtitle={t("moments.subtitle")}
      />
      <AppPageBody className="mx-auto max-w-2xl space-y-4 pb-12">
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--cofex-cream)]/50 px-4 py-3 text-xs leading-relaxed text-[color:var(--cofex-black)]/70">
          <p className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--cofex-cyan)]" />
            {t("moments.privacyNote")}
          </p>
          {!canShare && (
            <p className="mt-2">
              {t("moments.optInHint")}{" "}
              <Link to="/profile" className="font-semibold underline text-[color:var(--cofex-coffee-deep)]">
                {t("moments.profileLink")}
              </Link>
            </p>
          )}
        </div>

        {user?.id && <UserMomentUpload userId={user.id} canPublish={canShare} />}

        <MomentFeedFilters value={filter} onChange={setFilter} />

        {filter === "nearby" && !coords && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full"
            disabled={locating}
            onClick={() => {
              setLocating(true);
              navigator.geolocation?.getCurrentPosition(
                (pos) => {
                  setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setLocating(false);
                },
                () => setLocating(false),
              );
            }}
          >
            {locating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Locate className="mr-1.5 h-4 w-4" />
            )}
            {t("moments.enableLocation")}
          </Button>
        )}

        {feedQuery.isLoading ? (
          <div className="flex justify-center py-16 text-sm text-[color:var(--cofex-black)]/55">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t("moments.loading")}
          </div>
        ) : feedQuery.isError ? (
          <p className="text-center text-sm text-rose-700">{t("moments.loadError")}</p>
        ) : items.length === 0 ? (
          <MomentsEmptyState />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <MomentFeedCard
                key={item.id}
                item={item}
                likeBusy={likeMutation.isPending}
                saveBusy={saveMutation.isPending}
                onLike={() => likeMutation.mutate(item.id)}
                onSave={() => saveMutation.mutate(item.id)}
              />
            ))}
            {feedQuery.hasNextPage && (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                disabled={feedQuery.isFetchingNextPage}
                onClick={() => feedQuery.fetchNextPage()}
              >
                {feedQuery.isFetchingNextPage ? t("moments.loadingMore") : t("moments.loadMore")}
              </Button>
            )}
          </div>
        )}
      </AppPageBody>
    </AppPage>
  );
}
