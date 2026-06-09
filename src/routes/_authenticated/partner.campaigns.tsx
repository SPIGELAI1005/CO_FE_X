import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/partner/campaigns")({
  component: () => (
    <PlaceholderPage
      eyebrow="Campaigns"
      title="Create & manage campaigns"
      description="Set hashtags, rewards, dates — then watch explorers show up."
    />
  ),
});
