import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Gift, Users, Calendar, Hash, MapPin } from "lucide-react";
import { AppPage, AppPageBody, AppPageHeader } from "@/components/app/AppPageShell";
import { EmptyState } from "@/components/patterns/EmptyState";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { getCampaignTypeMeta } from "@/lib/campaign-types";
import { useActiveCampaigns, type CampaignListItem } from "@/lib/queries/campaigns";

export const Route = createFileRoute("/_authenticated/_explorer/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns · CO:FE(X)" }] }),
  component: ExplorerCampaignsPage,
});

function ExplorerCampaignsPage() {
  const { t } = useTranslation();
  const campaignsQuery = useActiveCampaigns();

  return (
    <AppPage>
      <AppPageHeader
        eyebrow={t("pages.campaigns.eyebrow")}
        title={t("pages.campaigns.title")}
        subtitle={t("pages.campaigns.subtitle")}
      />
      <AppPageBody className="pb-8">
        <QueryBoundary
          query={campaignsQuery}
          loadingLabel={t("campaignsPage.loading")}
          isEmpty={(items) => items.length === 0}
          emptyTitle={t("campaignsPage.emptyTitle")}
          emptyDescription={t("campaignsPage.emptyDescription")}
          emptyActionLabel={t("campaignsPage.emptyAction")}
          emptyActionTo="/explore"
        >
          {(items) => (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <CampaignCard key={c.id} c={c} />
              ))}
            </div>
          )}
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
  );
}

function CampaignCard({ c }: { c: CampaignListItem }) {
  const cover = c.cover_image_url ?? c.coffee_shops?.cover_image_url;
  const remaining = c.max_participants ? Math.max(0, c.max_participants - c.participant_count) : null;
  const pct = c.max_participants
    ? Math.min(100, Math.round((c.participant_count / c.max_participants) * 100))
    : 0;
  const { Icon: TypeIcon } = getCampaignTypeMeta(c.campaign_type);

  return (
    <Link
      to="/campaign/$id"
      params={{ id: c.id }}
      className="cofex-app-card group overflow-hidden transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-40 bg-gradient-to-br from-[color:var(--cofex-pastel-blue)] to-[color:var(--cofex-cream)]">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-[color:var(--cofex-coffee-deep)] shadow-sm">
          <TypeIcon className="h-5 w-5 text-[color:var(--cofex-cyan)]" />
        </div>
        <div className="absolute right-3 bottom-3 left-3 text-white">
          <div className="text-xs tracking-widest uppercase opacity-80">{c.hashtag}</div>
          <h3 className="text-lg leading-tight font-bold">{c.title}</h3>
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-sm text-[color:var(--cofex-black)]/65">{c.description}</p>
        <div className="mt-3 space-y-2 text-sm">
          <Meta Icon={Gift} text={c.reward_description ?? "Surprise reward"} />
          {c.coffee_shops && (
            <Meta
              Icon={MapPin}
              text={`${c.coffee_shops.name}${c.coffee_shops.city ? ` · ${c.coffee_shops.city}` : ""}`}
            />
          )}
          {c.ends_at && <Meta Icon={Calendar} text={`Ends ${new Date(c.ends_at).toLocaleDateString()}`} />}
        </div>
        {c.max_participants && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-[color:var(--cofex-black)]/55">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> {c.participant_count} / {c.max_participants}
              </span>
              <span>{remaining} spots left</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--cofex-cream)]">
              <div className="h-full" style={{ width: `${pct}%`, background: "var(--gradient-coffee)" }} />
            </div>
          </div>
        )}
        {c.requirements && (
          <div className="mt-3 inline-flex items-start gap-1 text-xs text-[color:var(--cofex-black)]/55">
            <Hash className="mt-0.5 h-3 w-3" /> {c.requirements}
          </div>
        )}
      </div>
    </Link>
  );
}

function Meta({ Icon, text }: { Icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex items-center gap-2 text-[color:var(--cofex-black)]/75">
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--cofex-cyan)]" />
      <span className="truncate">{text}</span>
    </div>
  );
}
