import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  component: () => (
    <PlaceholderPage eyebrow="Partners" title="Partner approval" description="Review applications and onboard new cafés." />
  ),
});
