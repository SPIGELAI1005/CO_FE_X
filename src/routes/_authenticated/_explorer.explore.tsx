import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/_explorer/explore")({
  head: () => ({ meta: [{ title: "Explore — CO:FE(X)" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Discover"
      title="Explore cafés near you"
      description="Interactive Leaflet map with nearby coffee shops, filters, and one-tap check-in will live here."
    >
      <div
        className="aspect-[4/5] sm:aspect-video w-full rounded-2xl border grid place-items-center text-sm text-muted-foreground"
        style={{ background: "var(--cofex-pastel-blue)", borderColor: "var(--border)" }}
      >
        Map preview coming next
      </div>
    </PlaceholderPage>
  ),
});
