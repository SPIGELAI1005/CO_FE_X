import { createFileRoute } from "@tanstack/react-router";
import { CoffeeShopPage } from "@/components/app/CoffeeShopPage";
import { EmptyState } from "@/components/patterns/EmptyState";
import { useUser } from "@/hooks/use-user";
import {
  approvedCoffeeShopQuery,
  coffeeShopOgImage,
  useCoffeeShopBySlug,
} from "@/lib/queries/coffee-shops";

export const Route = createFileRoute("/coffee/$slug")({
  ssr: true,
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(approvedCoffeeShopQuery(params.slug));
    } catch {
      return null;
    }
  },
  head: ({ params, loaderData }) => {
    const shop = loaderData ?? null;
    const title = shop ? `${shop.name} · CO:FE(X)` : `${params.slug} · CO:FE(X)`;
    const description =
      shop?.description?.slice(0, 160) ??
      (shop
        ? `Discover ${shop.name} in ${shop.city ?? "your city"}. Check in, earn rewards, and join EEFFOC campaigns on CO:FE(X).`
        : "Coffee shop on CO:FE(X)");
    const image = coffeeShopOgImage(shop);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ],
    };
  },
  component: PublicCoffeeShopPage,
});

function PublicCoffeeShopPage() {
  const { slug } = Route.useParams();
  const { user } = useUser();
  const shopQuery = useCoffeeShopBySlug(slug);
  const shop = shopQuery.data;

  if (shopQuery.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!shop) {
    return (
      <div className="min-h-screen p-8 max-w-md mx-auto" style={{ background: "var(--cofex-cream, #f5efe6)" }}>
        <EmptyState
          title="Café not found"
          description="This listing may have been removed or is still pending approval."
          actionLabel="Explore CO:FE(X)"
          actionTo="/"
        />
      </div>
    );
  }

  return (
    <CoffeeShopPage
      shop={shop}
      backTo={user ? "/explore" : "/"}
      backLabel={user ? "Explore" : "Home"}
    />
  );
}
