import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/partner/shop")({
  component: () => (
    <PlaceholderPage
      eyebrow="Shop"
      title="Your café profile"
      description="Manage name, photos, address, and opening hours."
    />
  ),
});
