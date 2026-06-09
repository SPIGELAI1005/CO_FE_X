import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/_explorer/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — CO:FE(X)" }] }),
  component: () => (
    <PlaceholderPage
      eyebrow="Compete"
      title="Top Explorers"
      description="See who's brewing the most impact this week."
    />
  ),
});
