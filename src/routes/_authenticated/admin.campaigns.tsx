import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/campaigns")({
  component: () => (
    <PlaceholderPage eyebrow="Campaigns" title="Campaign moderation" description="Approve, reject, or pause running campaigns." />
  ),
});
