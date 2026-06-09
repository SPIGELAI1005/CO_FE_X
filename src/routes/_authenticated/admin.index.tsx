import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: () => (
    <PlaceholderPage eyebrow="Overview" title="Admin console" description="Network-wide health, growth, and moderation queues." />
  ),
});
