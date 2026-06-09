import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/partner/rewards")({
  component: () => (
    <PlaceholderPage
      eyebrow="Rewards"
      title="Reward catalog"
      description="Define what explorers can redeem and at what point cost."
    />
  ),
});
