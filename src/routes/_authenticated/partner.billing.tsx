import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useUser } from "@/hooks/use-user";
import { usePartnerBilling } from "@/lib/queries/billing";
import { PLAN_CATALOG, limitsForPlan, type ShopPlan } from "@/lib/billing/plans";
import { AppPage, AppPageBody, AppPageHeader, AppPageSection } from "@/components/app/AppPageShell";
import { Button } from "@/components/ui/button";
import { QueryBoundary } from "@/components/patterns/QueryBoundary";
import { toast } from "sonner";
import { CreditCard, Crown, Loader2, Sparkles, Zap, Store } from "lucide-react";
import { PARTNER_BTN, PartnerEmptyState, PartnerStatusPill } from "@/components/app/partner/PartnerShell";

const searchSchema = z.object({
  checkout: z.enum(["success", "canceled"]).optional(),
});

export const Route = createFileRoute("/_authenticated/partner/billing")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Billing · Partner" }] }),
  component: PartnerBillingPage,
});

const stripeEnabled = import.meta.env.VITE_FEATURE_STRIPE === "true";

function PartnerBillingPage() {
  const { user } = useUser();
  const { checkout } = Route.useSearch();
  const navigate = useNavigate({ from: "/partner/billing" });
  const billingQuery = usePartnerBilling(user?.id);
  const [busyShopId, setBusyShopId] = useState<string | null>(null);

  useEffect(() => {
    if (checkout === "success") {
      toast.success("Subscription updated. Thanks for supporting CO:FE(X)!");
      navigate({ search: { checkout: undefined }, replace: true });
    } else if (checkout === "canceled") {
      toast.message("Checkout canceled");
      navigate({ search: { checkout: undefined }, replace: true });
    }
  }, [checkout, navigate]);

  async function startCheckout(shopId: string, plan: "pro" | "campaign_boost") {
    setBusyShopId(shopId);
    try {
      const { createStripeCheckout } = await import("@/lib/api/stripe.billing");
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
      const { createStripePortal } = await import("@/lib/api/stripe.billing");
      const { url } = await createStripePortal({ data: { shopId } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open billing portal");
      setBusyShopId(null);
    }
  }

  return (
    <AppPage>
      <AppPageHeader
        eyebrow="Partner billing"
        title="Plans & subscriptions"
        subtitle="Upgrade for more campaigns, multi-location listings, and promoted discover placement."
      />
      <AppPageBody className="max-w-4xl pb-10">
        {!stripeEnabled && (
          <div className="cofex-app-card mb-6 border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 shadow-none">
            Stripe checkout is disabled in this environment. Set{" "}
            <code className="text-xs">VITE_FEATURE_STRIPE=true</code> and server Stripe keys to enable payments. Plan
            limits still apply on the free tier.
          </div>
        )}

        <QueryBoundary query={billingQuery} loadingLabel="Loading billing…">
          {(summary) =>
            summary.shops.length === 0 ? (
              <PartnerEmptyState
                Icon={Store}
                title="Set up your shop first"
                description="Create your shop profile, then pick a plan for that location."
                to="/partner/shop"
                actionLabel="Set up shop profile"
              />
            ) : (
              <div className="space-y-8">
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

                <AppPageSection eyebrow="Compare" title="Plans" subtitle="Pick the tier that fits your café.">
                  <div className="grid gap-4 md:grid-cols-3">
                    {PLAN_CATALOG.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} />
                    ))}
                  </div>
                </AppPageSection>
              </div>
            )
          }
        </QueryBoundary>
      </AppPageBody>
    </AppPage>
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
    <div className="cofex-app-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--cofex-cyan)]">Location</p>
          <h2 className="text-xl font-extrabold text-[color:var(--cofex-coffee-deep)]">
            {shop.coffee_shops?.name ?? "Your café"}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge plan={shop.plan} status={shop.status} />
            {shop.current_period_end && (
              <span className="text-xs text-[color:var(--cofex-black)]/45">
                Renews {new Date(shop.current_period_end).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        {shop.stripe_customer_id && stripeEnabled && (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onPortal(shop.coffee_shop_id)} className="rounded-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="mr-1 h-4 w-4" />}
            Manage billing
          </Button>
        )}
      </div>

      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <li className="text-[color:var(--cofex-black)]/75">
          Active campaigns:{" "}
          <strong className="text-[color:var(--cofex-coffee-deep)]">
            {activeCampaigns}
            {campaignCap !== null ? ` / ${campaignCap}` : " (unlimited)"}
          </strong>
        </li>
        <li className="text-[color:var(--cofex-black)]/75">
          Analytics export: {limits.analyticsExport ? "Included" : "Pro only"}
        </li>
        <li className="text-[color:var(--cofex-black)]/75">
          Promoted discover: {limits.promotedDiscover ? "Included" : "Pro only"}
        </li>
      </ul>

      {shop.plan !== "pro" && stripeEnabled && (
        <div className="mt-4 flex flex-wrap gap-2">
          {shop.plan !== "campaign_boost" && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onCheckout(shop.coffee_shop_id, "campaign_boost")}
              className="rounded-full"
            >
              <Zap className="mr-1 h-4 w-4" /> Boost campaigns
            </Button>
          )}
          <Button size="sm" disabled={busy} onClick={() => onCheckout(shop.coffee_shop_id, "pro")} className={PARTNER_BTN}>
            <Crown className="mr-1 h-4 w-4" /> Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof PLAN_CATALOG)[number] }) {
  const limits = limitsForPlan(plan.id);
  const isPro = plan.id === "pro";
  return (
    <div className={`cofex-app-card p-5 ${isPro ? "ring-2 ring-[color:var(--cofex-cyan)]/40" : ""}`}>
      <div className="flex items-center gap-2">
        {plan.id === "pro" ? (
          <Crown className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
        ) : plan.id === "campaign_boost" ? (
          <Zap className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
        ) : (
          <Sparkles className="h-4 w-4 text-[color:var(--cofex-cyan)]" />
        )}
        <h3 className="font-extrabold text-[color:var(--cofex-coffee-deep)]">{plan.name}</h3>
      </div>
      <div className="mt-1 text-2xl font-extrabold">{plan.priceLabel}</div>
      <p className="mt-2 text-sm text-[color:var(--cofex-black)]/65">{plan.description}</p>
      <ul className="mt-3 space-y-1 text-sm text-[color:var(--cofex-black)]/75">
        {plan.highlights.map((h) => (
          <li key={h}>• {h}</li>
        ))}
        {limits.maxActiveCampaigns !== null && (
          <li className="text-xs text-[color:var(--cofex-black)]/45">
            Up to {limits.maxActiveCampaigns} active campaign{limits.maxActiveCampaigns === 1 ? "" : "s"}
          </li>
        )}
      </ul>
    </div>
  );
}

function StatusBadge({ plan, status }: { plan: ShopPlan; status: string }) {
  const label = plan === "listing" ? "Free listing" : `${plan.replace("_", " ")} · ${status}`;
  return <PartnerStatusPill tone={plan === "pro" ? "success" : "info"}>{label}</PartnerStatusPill>;
}
