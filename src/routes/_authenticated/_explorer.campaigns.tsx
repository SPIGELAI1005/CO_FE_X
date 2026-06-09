import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/_explorer/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — CO:FE(X)" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Earn"
      title="Active campaigns"
      description="Join campaigns, post on socials with the right hashtag, and unlock free coffees."
    />
  ),
});
