import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling } from "@/lib/queries/billing";
import { createStripeCheckout, createStripePortal } from "@/lib/api/stripe.billing";
import { PLAN_CATALOG, limitsForPlan, type ShopPlan } from "@/lib/billing/plans";
import { Button } from "@/components/ui/button";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { toast } from "sonner";
import { CreditCard, Crown, Loader2, Sparkles, Zap } from "lucide-react";

const searchSchema = z.object({
  checkout: fallback(z.enum(["success", "canceled"]).optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/partner/billing")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Billing — Partner" }] }),
  component: PartnerBillingPage,
});

const stripeEnabled = import.meta.env.VITE_FEATURE_STRIPE === "true";

function PartnerBillingPage() {
  const { user } = useUser();
  const { checkout } = Route.useSearch();
  const navigate = useNavigate({ from: "/_authenticated/partner/billing" });
  const billingQuery = usePartnerBilling(user?.id);
  const [busyShopId, setBusyShopId] = useState<string | null>(null);

  useEffect(() => {
    if (checkout === "success") {
      toast.success("Subscription updated — thanks for supporting CO:FE(X)!");
      navigate({ search: { checkout: undefined }, replace: true });
    } else if (checkout === "canceled") {
      toast.message("Checkout canceled");
      navigate({ search: { checkout: undefined }, replace: true });
    }
  }, [checkout, navigate]);

  async function startCheckout(shopId: string, plan: "pro" | "campaign_boost") {
    setBusyShopId(shopId);
    try {
      const { url } = await createStripeCheckout({ data: { shopId, plan } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
      setBusyShopId(null);
    }
  }

  async function openPortal(shopId: string) {
    setBusyShopId(shopId);
    try {
      const { url } = await createStripePortal({ data: { shopId } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setBusyShopId(null);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="text-xs uppercase tracking-[0.3em] text-amber-700">Partner billing</div>
      <h1 className="text-3xl font-serif font-bold mt-1">Plans & subscriptions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upgrade for more campaigns, multi-location listings, and promoted discover placement.
      </p>

      {!stripeEnabled && (
        <div
          className="mt-6 rounded-2xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--cofex-cream-warm)" }}
        >
          Stripe checkout is disabled in this environment. Set{" "}
          <code className="text-xs">VITE_FEATURE_STRIPE=true</code> and server Stripe keys to enable
          payments. Plan limits still apply on the free tier.
        </div>
      )}

      <QueryBoundary query={billingQuery} loadingLabel="Loading billing…">
        {(summary) =>
          summary.shops.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
              <StoreHint />
              <p className="mt-2 text-sm text-muted-foreground">
                Create your shop profile first, then pick a plan for that location.
              </p>
              <Button asChild className="mt-4 bg-amber-700 hover:bg-amber-800">
                <Link to="/partner/shop">Set up shop profile</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {summary.shops.map((shop) => (
                <ShopBillingCard
                  key={shop.coffee_shop_id}
                  shop={shop}
                  activeCampaigns={summary.activeCampaignCounts[shop.coffee_shop_id] ?? 0}
                  busy={busyShopId === shop.coffee_shop_id}
                  onCheckout={startCheckout}
                  onPortal={openPortal}
                />
              ))}

              <section>
                <h2 className="text-lg font-semibold mb-4">Compare plans</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {PLAN_CATALOG.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </section>
            </div>
          )
        }
      </QueryBoundary>
    </div>
  );
}

function ShopBillingCard({
  shop,
  activeCampaigns,
  busy,
  onCheckout,
  onPortal,
}: {
  shop: {
    coffee_shop_id: string;
    plan: ShopPlan;
    status: string;
    current_period_end: string | null;
    stripe_customer_id: string | null;
    coffee_shops: { name: string } | null;
  };
  activeCampaigns: number;
  busy: boolean;
  onCheckout: (shopId: string, plan: "pro" | "campaign_boost") => void;
  onPortal: (shopId: string) => void;
}) {
  const limits = limitsForPlan(shop.plan);
  const campaignCap = limits.maxActiveCampaigns;

  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Location</div>
          <h2 className="text-xl font-semibold">{shop.coffee_shops?.name ?? "Your café"}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge plan={shop.plan} status={shop.status} />
            {shop.current_period_end && (
              <span className="text-xs text-muted-foreground">
                Renews {new Date(shop.current_period_end).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {shop.stripe_customer_id && stripeEnabled && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onPortal(shop.coffee_shop_id)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
            Manage billing
          </Button>
        )}
      </div>

      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <li>
          Active campaigns:{" "}
          <strong>
            {activeCampaigns}
            {campaignCap !== null ? ` / ${campaignCap}` : " (unlimited)"}
          </strong>
        </li>
        <li>Analytics export: {limits.analyticsExport ? "Included" : "Pro only"}</li>
        <li>Promoted discover: {limits.promotedDiscover ? "Included" : "Pro only"}</li>
      </ul>

      {shop.plan !== "pro" && stripeEnabled && (
        <div className="mt-4 flex flex-wrap gap-2">
          {shop.plan !== "campaign_boost" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onCheckout(shop.coffee_shop_id, "campaign_boost")}
            >
              <Zap className="h-4 w-4 mr-1" /> Boost campaigns
            </Button>
          )}
          <Button
            size="sm"
            className="bg-amber-700 hover:bg-amber-800"
            disabled={busy}
            onClick={() => onCheckout(shop.coffee_shop_id, "pro")}
          >
            <Crown className="h-4 w-4 mr-1" /> Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof PLAN_CATALOG)[number] }) {
  const limits = limitsForPlan(plan.id);
  return (
    <div
      className={`rounded-2xl border p-5 ${plan.id === "pro" ? "border-amber-400 bg-amber-50/50" : ""}`}
      style={plan.id !== "pro" ? { borderColor: "var(--border)" } : undefined}
    >
      <div className="flex items-center gap-2">
        {plan.id === "pro" ? (
          <Crown className="h-4 w-4 text-amber-700" />
        ) : plan.id === "campaign_boost" ? (
          <Zap className="h-4 w-4 text-amber-700" />
        ) : (
          <Sparkles className="h-4 w-4 text-amber-700" />
        )}
        <h3 className="font-semibold">{plan.name}</h3>
      </div>
      <div className="mt-1 text-2xl font-bold">{plan.priceLabel}</div>
      <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      <ul className="mt-3 space-y-1 text-sm">
        {plan.highlights.map((h) => (
          <li key={h}>• {h}</li>
        ))}
        {limits.maxActiveCampaigns !== null && (
          <li className="text-xs text-muted-foreground">
            Up to {limits.maxActiveCampaigns} active campaign{limits.maxActiveCampaigns === 1 ? "" : "s"}
          </li>
        )}
      </ul>
    </div>
  );
}

function StatusBadge({ plan, status }: { plan: ShopPlan; status: string }) {
  const label = plan === "listing" ? "Free listing" : `${plan.replace("_", " ")} · ${status}`;
  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize">
      {label}
    </span>
  );
}

function StoreHint() {
  return <CreditCard className="h-10 w-10 mx-auto text-amber-700" />;
}
