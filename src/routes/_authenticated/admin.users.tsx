import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: () => (
    <PlaceholderPage eyebrow="Users" title="User management" description="Search users, assign roles, handle reports." />
  ),
});
