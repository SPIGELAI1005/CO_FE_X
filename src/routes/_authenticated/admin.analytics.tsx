import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: () => (
    <PlaceholderPage eyebrow="Analytics" title="Network analytics" description="Check-ins, engagement, and growth across cities." />
  ),
});
