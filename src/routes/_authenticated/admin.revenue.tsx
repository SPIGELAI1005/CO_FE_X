import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  component: () => (
    <PlaceholderPage eyebrow="Revenue" title="Revenue management" description="Subscriptions, payouts, and invoices." />
  ),
});
