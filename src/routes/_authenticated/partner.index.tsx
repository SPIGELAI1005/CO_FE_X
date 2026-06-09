import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/partner/")({
  component: () => (
    <PlaceholderPage
      eyebrow="Overview"
      title="Partner dashboard"
      description="Visitor stats, social reach, and engagement at a glance."
    />
  ),
});
