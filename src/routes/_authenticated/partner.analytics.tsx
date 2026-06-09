import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/partner/analytics")({
  component: () => (
    <PlaceholderPage
      eyebrow="Analytics"
      title="Reach, engagement & visits"
      description="Track campaign performance and repeat-customer rate."
    />
  ),
});
