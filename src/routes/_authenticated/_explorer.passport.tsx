import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/_explorer/passport")({
  head: () => ({ meta: [{ title: "Passport — CO:FE(X)" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Collect"
      title="Your Explorer Passport"
      description="Every visit gets stamped. Collect badges, unlock new cities, and level up."
    />
  ),
});
