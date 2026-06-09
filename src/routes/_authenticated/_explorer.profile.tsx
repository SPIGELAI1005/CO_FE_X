import { createFileRoute, Link } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/app/PlaceholderPage";
import { useUser } from "@/hooks/use-user";

export const Route = createFileRoute("/_authenticated/_explorer/profile")({
  head: () => ({ meta: [{ title: "Profile — CO:FE(X)" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isPartner, isAdmin } = useUser();
  return (
    <PlaceholderPage
      eyebrow="You"
      title="Your profile"
      description={user?.email ?? ""}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {isPartner && (
          <Link
            to="/partner"
            className="rounded-2xl border p-5 hover:shadow-md transition"
            style={{ borderColor: "var(--border)", background: "var(--cofex-cream-warm)" }}
          >
            <div className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--cofex-coffee-deep)" }}>
              Partner
            </div>
            <div className="mt-1 font-semibold">Open partner dashboard</div>
          </Link>
        )}
        {isAdmin && (
          <Link
            to="/admin"
            className="rounded-2xl border p-5 hover:shadow-md transition"
            style={{ borderColor: "var(--border)", background: "var(--cofex-pastel-lilac)" }}
          >
            <div className="text-xs font-bold tracking-wider uppercase">Admin</div>
            <div className="mt-1 font-semibold">Open admin console</div>
          </Link>
        )}
        {!isPartner && (
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Run a café?
            </div>
            <div className="mt-1 font-semibold">Apply to become a partner</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Application form coming in the next step.
            </p>
          </div>
        )}
      </div>
    </PlaceholderPage>
  );
}
